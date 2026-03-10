/**
 * Fulfillment Service — Phase 6 Pick / Reserve / Fulfillment Ledger
 *
 * SERVER-SIDE ONLY. Requires a Supabase admin client.
 * Never import this module from browser/client components.
 *
 * Outbound stock control rules (see docs/OUTBOUND_STOCK_RULES.md):
 *   - reserve   → increases reserved, does NOT reduce on_hand
 *   - unreserve → decreases reserved, does NOT change on_hand
 *   - pick      → decreases on_hand; an implicit unreserve movement is also
 *                 written so that reserved stays consistent
 *   - ship      → writes a ship movement ONLY if the item has not already been
 *                 picked for this order (prevents double-decrement)
 *   - pack      → administrative only; no balance change
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  createInventoryMovement,
  getInventoryBalance,
  type InventoryBalance,
} from "./movementService"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReservationLine {
  /** Must be a real inventory_items.id in the database. */
  inventoryItemId: string
  sku: string
  qty: number
  /** Optional: only set when the UI has persisted a real order_line row. */
  orderLineId?: string
}

export interface ReserveForOrderParams {
  tenantId: string
  orderId: string
  lines: ReservationLine[]
  actorId?: string | null
}

export interface ReservationSummaryLine {
  reservationId: string
  inventoryItemId: string
  sku: string
  orderLineId: string | null
  reservedQty: number
  pickedQty: number
  status: string
  balance: InventoryBalance | null
}

export interface OrderReservationSummary {
  orderId: string
  lines: ReservationSummaryLine[]
  totalReserved: number
  totalPicked: number
  fullyAllocated: boolean
  allPicked: boolean
}

export interface PickParams {
  tenantId: string
  reservationId: string
  /** How many units are being confirmed as physically picked. */
  pickedQty: number
  actorId?: string | null
  note?: string
}

export interface ReleaseReservationParams {
  tenantId: string
  orderId: string
  actorId?: string | null
  /** Optionally target a single reservation. If omitted, releases ALL active reservations for the order. */
  reservationId?: string
}

export interface ShipParams {
  tenantId: string
  orderId: string
  actorId?: string | null
}

// ── ID generation ─────────────────────────────────────────────────────────────

function generateReservationId(): string {
  return `RES-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

// ── reserveInventoryForOrder ──────────────────────────────────────────────────

/**
 * Reserve inventory for each line in an order.
 *
 * For every line:
 *   1. Checks available balance (on_hand − reserved).
 *   2. Writes a `reserve` movement through the movement service.
 *   3. Inserts an inventory_reservations row.
 *
 * Returns a list of created reservation IDs and any lines that could not be
 * fully reserved (due to insufficient stock).
 *
 * Does NOT update order status — the API route does that after this call
 * returns successfully.
 *
 * Throws on DB error. Partial success is possible: if the second line fails
 * after the first succeeds, the caller (API route) must decide whether to
 * release the partial reservation. In practice the route wraps this atomically
 * by releasing on error.
 */
export async function reserveInventoryForOrder(
  db: SupabaseClient,
  params: ReserveForOrderParams
): Promise<{
  reserved: { reservationId: string; inventoryItemId: string; sku: string; qty: number }[]
  insufficient: { inventoryItemId: string; sku: string; requested: number; available: number }[]
}> {
  const { tenantId, orderId, lines, actorId } = params
  const reserved: { reservationId: string; inventoryItemId: string; sku: string; qty: number }[] = []
  const insufficient: { inventoryItemId: string; sku: string; requested: number; available: number }[] = []

  for (const line of lines) {
    const balance = await getInventoryBalance(db, tenantId, line.inventoryItemId)
    const available = balance ? balance.available : 0

    if (available < line.qty) {
      insufficient.push({
        inventoryItemId: line.inventoryItemId,
        sku: line.sku,
        requested: line.qty,
        available,
      })
      continue
    }

    // Write reserve movement (increases reserved, does not reduce on_hand)
    const { movementId } = await createInventoryMovement(db, {
      tenantId,
      inventoryItemId: line.inventoryItemId,
      movementType: "reserve",
      qty: line.qty,
      referenceId: orderId,
      referenceType: "order",
      actorId: actorId ?? null,
      note: `Reserved for order ${orderId} — sku: ${line.sku}`,
    })

    const reservationId = generateReservationId()

    const { error: insErr } = await db.from("inventory_reservations").insert({
      id: reservationId,
      tenant_id: tenantId,
      order_id: orderId,
      order_line_id: line.orderLineId ?? null,
      inventory_item_id: line.inventoryItemId,
      sku: line.sku,
      reserved_qty: line.qty,
      picked_qty: 0,
      status: "active",
      movement_id: movementId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insErr) {
      throw new Error(`[fulfillmentService] Failed to insert reservation for sku ${line.sku}: ${insErr.message}`)
    }

    reserved.push({ reservationId, inventoryItemId: line.inventoryItemId, sku: line.sku, qty: line.qty })
  }

  return { reserved, insufficient }
}

// ── releaseReservation ────────────────────────────────────────────────────────

/**
 * Release active reservations for an order (or a single reservation).
 *
 * For each active reservation:
 *   1. Writes an `unreserve` movement to return qty to available.
 *   2. Marks the reservation as `released`.
 *
 * partially_picked reservations: only the un-picked portion is released
 * (reserved_qty − picked_qty). Already picked stock has already left on_hand;
 * there is nothing to unreserve for that portion.
 *
 * fulfilled / released / cancelled reservations: skipped (idempotent).
 */
export async function releaseReservation(
  db: SupabaseClient,
  params: ReleaseReservationParams
): Promise<{ released: string[] }> {
  const { tenantId, orderId, actorId, reservationId } = params

  let query = db
    .from("inventory_reservations")
    .select("id, inventory_item_id, sku, reserved_qty, picked_qty, status")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .in("status", ["active", "partially_picked"])

  if (reservationId) {
    query = query.eq("id", reservationId)
  }

  const { data: reservations, error: fetchErr } = await query

  if (fetchErr) {
    throw new Error(`[fulfillmentService] Failed to fetch reservations: ${fetchErr.message}`)
  }

  const releasedIds: string[] = []

  for (const res of reservations ?? []) {
    const releasableQty = res.reserved_qty - res.picked_qty
    if (releasableQty <= 0) {
      // Fully picked — nothing to unreserve; just close the record
      await db
        .from("inventory_reservations")
        .update({ status: "released", updated_at: new Date().toISOString() })
        .eq("id", res.id)
      releasedIds.push(res.id)
      continue
    }

    // Write unreserve movement
    await createInventoryMovement(db, {
      tenantId,
      inventoryItemId: res.inventory_item_id,
      movementType: "unreserve",
      qty: releasableQty,
      referenceId: orderId,
      referenceType: "order",
      actorId: actorId ?? null,
      note: `Released reservation ${res.id} for order ${orderId}`,
    })

    await db
      .from("inventory_reservations")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("id", res.id)

    releasedIds.push(res.id)
  }

  return { released: releasedIds }
}

// ── pickReservedInventory ─────────────────────────────────────────────────────

/**
 * Confirm that a picker has physically removed reserved inventory from the shelf.
 *
 * Steps:
 *   1. Validate the reservation is active or partially_picked.
 *   2. Validate picked qty ≤ remaining (reserved_qty − picked_qty).
 *   3. Write an `unreserve` movement → reduces reserved (removes the allocation).
 *   4. Write a `pick` movement → reduces on_hand (item left the shelf).
 *   5. Update reservation: increment picked_qty, advance status.
 *
 * Two ledger movements are written so the audit trail is explicit about what
 * happened to each balance dimension.
 */
export async function pickReservedInventory(
  db: SupabaseClient,
  params: PickParams
): Promise<{
  unreserveMovementId: string
  pickMovementId: string
  newStatus: string
}> {
  const { tenantId, reservationId, pickedQty, actorId, note } = params

  // Fetch the reservation
  const { data: res, error: fetchErr } = await db
    .from("inventory_reservations")
    .select("id, tenant_id, order_id, inventory_item_id, sku, reserved_qty, picked_qty, status")
    .eq("id", reservationId)
    .eq("tenant_id", tenantId)
    .single()

  if (fetchErr || !res) {
    throw new Error(`[fulfillmentService] Reservation ${reservationId} not found.`)
  }

  if (!["active", "partially_picked"].includes(res.status)) {
    throw new Error(
      `[fulfillmentService] Reservation ${reservationId} is in status '${res.status}' and cannot be picked.`
    )
  }

  const remaining = res.reserved_qty - res.picked_qty
  if (pickedQty > remaining) {
    throw new Error(
      `[fulfillmentService] Cannot pick ${pickedQty} — only ${remaining} units remain un-picked in reservation ${reservationId}.`
    )
  }

  const orderId = res.order_id
  const inventoryItemId = res.inventory_item_id

  // 1. Unreserve movement: removes the allocated qty from reserved
  const { movementId: unreserveMovementId } = await createInventoryMovement(db, {
    tenantId,
    inventoryItemId,
    movementType: "unreserve",
    qty: pickedQty,
    referenceId: orderId,
    referenceType: "order",
    actorId: actorId ?? null,
    note: `Pick confirmation for reservation ${reservationId} — removing from reserved`,
  })

  // 2. Pick movement: removes qty from on_hand (item physically leaves shelf)
  const { movementId: pickMovementId } = await createInventoryMovement(db, {
    tenantId,
    inventoryItemId,
    movementType: "pick",
    qty: pickedQty,
    referenceId: orderId,
    referenceType: "order",
    actorId: actorId ?? null,
    note: note ?? `Pick for order ${orderId}, reservation ${reservationId}`,
  })

  // 3. Update reservation record
  const newPickedQty = res.picked_qty + pickedQty
  const newStatus =
    newPickedQty >= res.reserved_qty ? "fulfilled" : "partially_picked"

  const { error: updErr } = await db
    .from("inventory_reservations")
    .update({
      picked_qty: newPickedQty,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)

  if (updErr) {
    throw new Error(`[fulfillmentService] Failed to update reservation: ${updErr.message}`)
  }

  return { unreserveMovementId, pickMovementId, newStatus }
}

// ── finalizeShipmentInventoryImpact ──────────────────────────────────────────

/**
 * Write a `ship` ledger movement ONLY for items that were NOT already picked.
 *
 * If pick movements already exist for an item on this order, the on_hand was
 * already decremented at pick time — writing ship again would double-count.
 *
 * This function checks for existing pick movements per item, then:
 *   - If fully picked: skip (noop) — on_hand already correct.
 *   - If not picked at all: write a `ship` movement to decrement on_hand.
 *   - If partially picked: write a `ship` movement for the un-picked portion
 *     (rare in practice, but handled gracefully).
 *
 * Also marks all active/partially_picked reservations for this order as
 * fulfilled to close the lifecycle cleanly.
 */
export async function finalizeShipmentInventoryImpact(
  db: SupabaseClient,
  params: ShipParams
): Promise<{ shipMovements: string[] }> {
  const { tenantId, orderId, actorId } = params

  // Fetch all reservations for this order
  const { data: reservations, error: resErr } = await db
    .from("inventory_reservations")
    .select("id, inventory_item_id, sku, reserved_qty, picked_qty, status")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)

  if (resErr) {
    throw new Error(`[fulfillmentService] Failed to fetch reservations: ${resErr.message}`)
  }

  const shipMovements: string[] = []

  for (const res of reservations ?? []) {
    const unpickedQty = res.reserved_qty - res.picked_qty

    if (unpickedQty > 0 && !["fulfilled", "released", "cancelled"].includes(res.status)) {
      // Un-picked items: write ship movement to take them off on_hand
      const { movementId } = await createInventoryMovement(db, {
        tenantId,
        inventoryItemId: res.inventory_item_id,
        movementType: "ship",
        qty: unpickedQty,
        referenceId: orderId,
        referenceType: "order",
        actorId: actorId ?? null,
        note: `Ship without prior pick for order ${orderId}, reservation ${res.id}`,
      })
      shipMovements.push(movementId)

      // Also unreserve the un-picked portion so reserved balance is correct
      await createInventoryMovement(db, {
        tenantId,
        inventoryItemId: res.inventory_item_id,
        movementType: "unreserve",
        qty: unpickedQty,
        referenceId: orderId,
        referenceType: "order",
        actorId: actorId ?? null,
        note: `Unreserve on ship for order ${orderId}, reservation ${res.id}`,
      })
    }

    // Close the reservation record
    if (!["fulfilled", "released", "cancelled"].includes(res.status)) {
      await db
        .from("inventory_reservations")
        .update({ status: "fulfilled", updated_at: new Date().toISOString() })
        .eq("id", res.id)
    }
  }

  return { shipMovements }
}

// ── getOrderReservationSummary ────────────────────────────────────────────────

/**
 * Returns a summary of all reservation records for an order, enriched with
 * current balance data so the UI can show available / reserved / picked status.
 */
export async function getOrderReservationSummary(
  db: SupabaseClient,
  tenantId: string,
  orderId: string
): Promise<OrderReservationSummary> {
  const { data: rows, error } = await db
    .from("inventory_reservations")
    .select("id, inventory_item_id, sku, order_line_id, reserved_qty, picked_qty, status")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`[fulfillmentService] Failed to fetch reservation summary: ${error.message}`)
  }

  const lines: ReservationSummaryLine[] = []
  let totalReserved = 0
  let totalPicked = 0

  for (const row of rows ?? []) {
    const balance = await getInventoryBalance(db, tenantId, row.inventory_item_id)
    lines.push({
      reservationId: row.id,
      inventoryItemId: row.inventory_item_id,
      sku: row.sku,
      orderLineId: row.order_line_id ?? null,
      reservedQty: row.reserved_qty,
      pickedQty: row.picked_qty,
      status: row.status,
      balance,
    })
    totalReserved += row.reserved_qty
    totalPicked += row.picked_qty
  }

  const fullyAllocated = lines.length > 0 && lines.every(l => l.status !== "released" && l.status !== "cancelled")
  const allPicked = lines.length > 0 && lines.every(l => l.status === "fulfilled")

  return { orderId, lines, totalReserved, totalPicked, fullyAllocated, allPicked }
}
