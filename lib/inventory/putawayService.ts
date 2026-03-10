/**
 * Putaway Service — Phase 9: Directed Putaway
 *
 * SERVER-SIDE ONLY. Requires a Supabase admin client.
 *
 * Flow:
 *   1. generatePutawayTasks   — after a receiving session is finalized, create
 *                               one Putaway task per received inventory item.
 *                               Source location = STAGING-{shipmentId}.
 *                               Destination = from pallet assignment if known,
 *                               otherwise left null for manual assignment.
 *   2. confirmPutawayTask     — validate the task, write a ledger 'putaway'
 *                               movement (location-only, no balance change),
 *                               update inventory_items.location, mark complete.
 *   3. getPutawayTasksForShipment — query all Putaway tasks for a shipment.
 *   4. getPutawayStatusForShipment — aggregate counts (pending/in_progress/done).
 *
 * Staging location convention:
 *   STAGING-{shipmentId}     e.g. "STAGING-SHIP-20260310-001"
 *   This is a text convention — no staging locations table is required.
 *   The dock door is recorded in the note for traceability.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { createInventoryMovement } from "./movementService"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PutawayTaskRow {
  id: string
  tenantId: string
  status: "pending" | "in_progress" | "completed"
  assignee: string
  priority: "normal" | "high" | "urgent"
  inventoryItemId: string | null
  sku: string | null
  qty: number
  sourceLocation: string | null
  destinationLocation: string | null
  inboundShipmentId: string | null
  receivingSessionId: string | null
  completedAt: string | null
  completedByUserId: string | null
  createdAt: string
}

export interface PutawayStatusSummary {
  total: number
  pending: number
  inProgress: number
  completed: number
  allComplete: boolean
  tasks: PutawayTaskRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTaskId(): string {
  return `TSK-PA-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

/**
 * The conventional staging location code for a given shipment.
 * Inventory lands here after receiving, before putaway moves it to storage.
 */
export function buildStagingLocation(shipmentId: string): string {
  return `STAGING-${shipmentId}`
}

function mapTaskRow(r: Record<string, unknown>): PutawayTaskRow {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    status: r.status as "pending" | "in_progress" | "completed",
    assignee: (r.assignee as string) ?? "Unassigned",
    priority: (r.priority as "normal" | "high" | "urgent") ?? "normal",
    inventoryItemId: (r.inventory_item_id as string | null) ?? null,
    sku: (r.sku as string | null) ?? null,
    qty: (r.qty as number) ?? 0,
    sourceLocation: (r.source_location as string | null) ?? null,
    destinationLocation: (r.destination_location as string | null) ?? null,
    inboundShipmentId: (r.inbound_shipment_id as string | null) ?? null,
    receivingSessionId: (r.receiving_session_id as string | null) ?? null,
    completedAt: (r.completed_at as string | null) ?? null,
    completedByUserId: (r.completed_by_user_id as string | null) ?? null,
    createdAt: r.created_at as string,
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Generate putaway tasks from a completed receiving session.
 *
 * One task is created per distinct inventory_item_id in the session's
 * posted scans. Quantities are aggregated across all scans for that item.
 *
 * Destination suggestion logic (in priority order):
 *   1. Pallet's assigned_location_code on inbound_pallets (shipment pre-assignment)
 *   2. Null — operator must choose destination before confirming
 *
 * Idempotent: if Putaway tasks already exist for this session, returns
 * the existing task IDs and created=0.
 */
export async function generatePutawayTasks(
  db: SupabaseClient,
  tenantId: string,
  sessionId: string,
  shipmentId: string,
  actorId?: string | null
): Promise<{ created: number; skipped: number; taskIds: string[] }> {
  // Idempotency check: skip if already generated
  const { data: existing } = await db
    .from("tasks")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("receiving_session_id", sessionId)
    .eq("type", "Putaway")

  if (existing && existing.length > 0) {
    return {
      created: 0,
      skipped: existing.length,
      taskIds: existing.map((r: { id: string }) => r.id),
    }
  }

  // Load posted scans for this session
  const { data: scans, error: scansErr } = await db
    .from("receiving_scans")
    .select("inventory_item_id, sku, resolved_base_qty")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)
    .eq("outcome", "posted")

  if (scansErr) {
    throw new Error(`[putawayService] Failed to load scans: ${scansErr.message}`)
  }

  // Aggregate qty per inventory_item_id
  const grouped: Record<string, { sku: string | null; qty: number }> = {}
  for (const scan of scans ?? []) {
    if (!scan.inventory_item_id) continue
    if (!grouped[scan.inventory_item_id]) {
      grouped[scan.inventory_item_id] = { sku: scan.sku ?? null, qty: 0 }
    }
    grouped[scan.inventory_item_id].qty += scan.resolved_base_qty ?? 0
  }

  if (Object.keys(grouped).length === 0) {
    return { created: 0, skipped: 0, taskIds: [] }
  }

  // Load pallet location suggestions (shipment pre-assignments)
  const { data: pallets } = await db
    .from("inbound_pallets")
    .select("assigned_location_code")
    .eq("shipment_id", shipmentId)
    .not("assigned_location_code", "is", null)

  // First pre-assigned location code found becomes the default suggestion.
  // More sophisticated per-SKU slotting is deferred to a future phase.
  const suggestedDestination =
    pallets?.find(
      (p: { assigned_location_code: string | null }) => p.assigned_location_code
    )?.assigned_location_code ?? null

  const source = buildStagingLocation(shipmentId)
  const taskIds: string[] = []
  const now = new Date().toISOString()

  for (const [inventoryItemId, { sku, qty }] of Object.entries(grouped)) {
    if (qty <= 0) continue
    const taskId = genTaskId()

    const { error } = await db.from("tasks").insert({
      id: taskId,
      tenant_id: tenantId,
      type: "Putaway",
      status: "pending",
      assignee: "Unassigned",
      location: source,
      items: 1,
      priority: "normal",
      inbound_shipment_id: shipmentId,
      receiving_session_id: sessionId,
      inventory_item_id: inventoryItemId,
      sku,
      qty,
      source_location: source,
      destination_location: suggestedDestination,
      created_at: now,
    })

    if (error) {
      console.error(
        `[putawayService] Failed to create task for item ${inventoryItemId}:`,
        error.message
      )
    } else {
      taskIds.push(taskId)
    }
  }

  return { created: taskIds.length, skipped: 0, taskIds }
}

/**
 * Confirm a putaway task.
 *
 * Steps:
 *   1. Load and validate the task (must be Putaway, not yet completed)
 *   2. Write a 'putaway' ledger movement:
 *        from_location = source (staging)
 *        to_location   = destinationLocation
 *        qty_delta     = 0 (location-only — on_hand does not change)
 *   3. Update inventory_items.location to the destination
 *   4. Mark task completed with completed_at and completed_by_user_id
 *
 * Idempotency: throws if task is already completed.
 * Does not change on_hand or reserved balances.
 */
export async function confirmPutawayTask(
  db: SupabaseClient,
  tenantId: string,
  taskId: string,
  destinationLocation: string,
  actorId?: string | null
): Promise<{ movementId: string }> {
  if (!destinationLocation || destinationLocation.trim() === "") {
    throw new Error("[putawayService] destinationLocation is required")
  }

  // Load task
  const { data: task, error: taskErr } = await db
    .from("tasks")
    .select(
      "id, tenant_id, type, status, inventory_item_id, sku, qty, source_location, inbound_shipment_id"
    )
    .eq("id", taskId)
    .eq("tenant_id", tenantId)
    .single()

  if (taskErr || !task) {
    throw new Error(`[putawayService] Task ${taskId} not found`)
  }
  if (task.type !== "Putaway") {
    throw new Error(`[putawayService] Task ${taskId} is type '${task.type}', not Putaway`)
  }
  if (task.status === "completed") {
    throw new Error(`[putawayService] Task ${taskId} is already completed`)
  }
  if (!task.inventory_item_id) {
    throw new Error(`[putawayService] Task ${taskId} has no inventory_item_id`)
  }

  const sourceLocation =
    task.source_location ??
    buildStagingLocation(task.inbound_shipment_id ?? "unknown")

  const qty = Math.max(1, task.qty ?? 1)
  const dest = destinationLocation.trim()

  // Write putaway ledger movement (location-only — qty_delta = 0)
  const { movementId } = await createInventoryMovement(db, {
    tenantId,
    inventoryItemId: task.inventory_item_id,
    movementType: "putaway",
    qty,
    fromLocation: sourceLocation,
    toLocation: dest,
    referenceId: taskId,
    referenceType: "task",
    actorId: actorId ?? null,
    note: `Directed putaway: ${sourceLocation} → ${dest}${task.sku ? ` | SKU: ${task.sku}` : ""} | qty: ${qty}`,
  })

  // Update inventory_items.location to the confirmed destination
  await db
    .from("inventory_items")
    .update({ location: dest })
    .eq("id", task.inventory_item_id)
    .eq("tenant_id", tenantId)

  // Mark task completed
  const now = new Date().toISOString()
  await db
    .from("tasks")
    .update({
      status: "completed",
      destination_location: dest,
      completed_at: now,
      completed_by_user_id: actorId ?? null,
    })
    .eq("id", taskId)

  return { movementId }
}

/**
 * Return all Putaway tasks for a shipment, ordered by creation time.
 */
export async function getPutawayTasksForShipment(
  db: SupabaseClient,
  tenantId: string,
  shipmentId: string
): Promise<PutawayTaskRow[]> {
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("inbound_shipment_id", shipmentId)
    .eq("type", "Putaway")
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`[putawayService] Failed to load tasks: ${error.message}`)
  }

  return (data ?? []).map(mapTaskRow)
}

/**
 * Aggregate putaway progress counts for a shipment.
 */
export async function getPutawayStatusForShipment(
  db: SupabaseClient,
  tenantId: string,
  shipmentId: string
): Promise<PutawayStatusSummary> {
  const tasks = await getPutawayTasksForShipment(db, tenantId, shipmentId)
  const pending = tasks.filter((t) => t.status === "pending").length
  const inProgress = tasks.filter((t) => t.status === "in_progress").length
  const completed = tasks.filter((t) => t.status === "completed").length

  return {
    total: tasks.length,
    pending,
    inProgress,
    completed,
    allComplete: tasks.length > 0 && completed === tasks.length,
    tasks,
  }
}

/**
 * Find the most recently completed receiving session for a shipment.
 * Used by the generate-from-shipment endpoint that doesn't know the session ID.
 */
export async function findLatestCompletedSession(
  db: SupabaseClient,
  tenantId: string,
  shipmentId: string
): Promise<string | null> {
  const { data } = await db
    .from("receiving_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("inbound_shipment_id", shipmentId)
    .eq("status", "completed")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}
