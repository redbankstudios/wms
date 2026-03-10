/**
 * Smart Receiving Service — Phase 4
 *
 * SERVER-SIDE ONLY. Requires a Supabase admin client.
 *
 * Flow:
 *   1. openReceivingSession      — create a session tied to an inbound_shipment
 *   2. recordReceivingScan       — capture a barcode/SKU + qty scan
 *   3. postReceivingScanToLedger — write a "receive" movement for a posted scan
 *   4. finalizeReceivingSession  — mark session completed, raise open exceptions
 *   5. createReceivingException  — manually raise a receiving exception
 *   6. summarizeReceivingSession — compute expected vs received reconciliation
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { resolveBarcode } from "./barcodeService"
import { createInventoryMovement } from "./movementService"
import { buildStagingLocation } from "./putawayService"

// ── ID generators ─────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionStatus = "open" | "paused" | "completed" | "cancelled"
export type ScanOutcome   = "matched" | "unmatched" | "exception" | "posted"
export type ExceptionType =
  | "unknown_barcode" | "sku_mismatch" | "overage"
  | "shortage" | "damaged" | "missing_item"
export type ExceptionStatus = "open" | "approved" | "rejected" | "resolved"

export interface ReceivingSession {
  id: string
  tenantId: string
  inboundShipmentId: string
  operatorUserId: string | null
  status: SessionStatus
  startedAt: string
  closedAt: string | null
  notes: string | null
}

export interface ReceivingScan {
  id: string
  tenantId: string
  sessionId: string
  inboundShipmentId: string
  barcode: string | null
  sku: string | null
  productId: string | null
  inventoryItemId: string | null
  uom: string | null
  scannedQty: number
  resolvedBaseQty: number | null
  movementId: string | null
  outcome: ScanOutcome
  exceptionCode: ExceptionType | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ReceivingException {
  id: string
  tenantId: string
  sessionId: string
  inboundShipmentId: string
  exceptionType: ExceptionType
  barcode: string | null
  sku: string | null
  expectedQty: number | null
  receivedQty: number | null
  status: ExceptionStatus
  notes: string | null
  createdAt: string
}

export interface ReceivingSessionSummary {
  session: ReceivingSession
  totalScans: number
  postedScans: number
  exceptionCount: number
  /** Map from SKU → { expectedQty, receivedQty } */
  reconciliation: Record<string, { expectedQty: number; receivedQty: number }>
  openExceptions: ReceivingException[]
}

// ── Expected-qty helper ───────────────────────────────────────────────────────

/**
 * Build a map of SKU → expected quantity from inbound_boxes / inbound_box_items
 * for a given shipment.
 */
async function _expectedBySku(
  db: SupabaseClient,
  shipmentId: string
): Promise<Record<string, number>> {
  // Resolve pallets → boxes → items
  const { data: pallets } = await db
    .from("inbound_pallets")
    .select("id")
    .eq("shipment_id", shipmentId)

  if (!pallets?.length) return {}

  const palletIds = pallets.map((p) => p.id)

  const { data: boxes } = await db
    .from("inbound_boxes")
    .select("id")
    .in("pallet_id", palletIds)

  if (!boxes?.length) return {}

  const boxIds = boxes.map((b) => b.id)

  const { data: items } = await db
    .from("inbound_box_items")
    .select("sku, quantity")
    .in("box_id", boxIds)

  const totals: Record<string, number> = {}
  for (const item of items ?? []) {
    totals[item.sku] = (totals[item.sku] ?? 0) + item.quantity
  }
  return totals
}

// ── SkuNotFoundError ──────────────────────────────────────────────────────────

/**
 * Thrown by recordReceivingScan when entryMode = "sku" and the supplied SKU
 * does not match any inventory_items row for the tenant.
 *
 * This is a validation error, not an exception-worthy event — no scan row is
 * created and no barcode-learning exception is raised.
 */
export class SkuNotFoundError extends Error {
  readonly sku: string
  constructor(sku: string) {
    super(`SKU '${sku}' not found in inventory for this tenant`)
    this.name = "SkuNotFoundError"
    this.sku = sku
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Open a new receiving session for an inbound shipment.
 * A shipment can have multiple sessions (paused + resumed), but only one "open" at a time.
 */
export async function openReceivingSession(
  db: SupabaseClient,
  tenantId: string,
  shipmentId: string,
  operatorUserId?: string | null,
  notes?: string
): Promise<{ sessionId: string }> {
  // Ensure no other open session for this shipment
  const { data: existing } = await db
    .from("receiving_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("inbound_shipment_id", shipmentId)
    .eq("status", "open")
    .maybeSingle()

  if (existing) {
    return { sessionId: existing.id }
  }

  const sessionId = genId("SES")
  const { error } = await db.from("receiving_sessions").insert({
    id: sessionId,
    tenant_id: tenantId,
    inbound_shipment_id: shipmentId,
    operator_user_id: operatorUserId ?? null,
    status: "open",
    notes: notes ?? null,
  })

  if (error) throw new Error(`[receivingService] openSession failed: ${error.message}`)

  return { sessionId }
}

/**
 * Record a single scan (barcode or SKU entry) against a session.
 *
 * Matching rules:
 *   - If barcode provided: resolve via barcodeService → get SKU + UOM + multiplier
 *   - If SKU provided directly (no barcode): look up inventory_items by SKU
 *   - Compare resolved SKU against expected manifest (inbound_box_items)
 *   - Outcomes: matched (in manifest), unmatched (not in manifest), exception (needs review)
 *
 * Does NOT write to ledger. Call postReceivingScanToLedger separately.
 */
export async function recordReceivingScan(
  db: SupabaseClient,
  tenantId: string,
  sessionId: string,
  shipmentId: string,
  input: {
    barcode?: string
    sku?: string
    scannedQty?: number
    /**
     * "barcode" (default): input is treated as a barcode string. Unknown barcodes
     *   produce an unknown_barcode exception so they can be learned later.
     * "sku": input is resolved directly against inventory_items.sku. A missing SKU
     *   throws SkuNotFoundError (no scan row created, no exception raised). This
     *   is an operator fallback path, not a barcode-learning event.
     */
    entryMode?: "barcode" | "sku"
  }
): Promise<{
  scanId: string
  outcome: ScanOutcome
  resolvedSku: string | null
  resolvedBaseQty: number | null
  expectedQty: number | null
  exceptionCode: ExceptionType | null
}> {
  const scannedQty = input.scannedQty ?? 1
  const scanId = genId("SCN")

  let barcode: string | null = input.barcode ?? null
  let sku: string | null = input.sku ?? null
  let productId: string | null = null
  let inventoryItemId: string | null = null
  let uom: string | null = null
  let resolvedBaseQty: number | null = null
  let outcome: ScanOutcome = "unmatched"
  let exceptionCode: ExceptionType | null = null

  // ── Step 1: resolve barcode if provided ──────────────────────────────────
  if (barcode) {
    const resolution = await resolveBarcode(db, barcode, tenantId)

    if (!resolution) {
      // Unknown barcode — record as exception
      exceptionCode = "unknown_barcode"
      outcome = "exception"
    } else {
      sku = resolution.sku
      productId = resolution.productId
      inventoryItemId = resolution.inventoryItemId
      uom = resolution.uom
      resolvedBaseQty = scannedQty * resolution.quantityMultiplier
    }
  } else if (sku) {
    // Direct SKU entry — look up inventory item
    const { data: itemRows } = await db
      .from("inventory_items")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("sku", sku)
      .limit(1)
    const item = itemRows?.[0] ?? null

    // Manual SKU mode: a missing inventory item is a user validation error.
    // Do NOT create a scan row and do NOT raise an unknown_barcode exception —
    // this is an operator fallback path, not a barcode-learning event.
    if (input.entryMode === "sku" && !item) {
      throw new SkuNotFoundError(sku)
    }

    inventoryItemId = item?.id ?? null
    resolvedBaseQty = scannedQty
    uom = "each"
  }

  // ── Step 2: check against manifest ───────────────────────────────────────
  let expectedQty: number | null = null
  if (sku && outcome !== "exception") {
    const expected = await _expectedBySku(db, shipmentId)
    expectedQty = expected[sku] ?? null

    if (expectedQty === null) {
      // SKU not in manifest
      exceptionCode = "sku_mismatch"
      outcome = "exception"
    } else if (resolvedBaseQty !== null && resolvedBaseQty > expectedQty) {
      // Received more than expected
      exceptionCode = "overage"
      outcome = "exception"
    } else {
      outcome = "matched"
    }
  }

  // ── Step 3: insert scan row ───────────────────────────────────────────────
  const { error } = await db.from("receiving_scans").insert({
    id: scanId,
    tenant_id: tenantId,
    session_id: sessionId,
    inbound_shipment_id: shipmentId,
    barcode,
    sku,
    product_id: productId,
    inventory_item_id: inventoryItemId,
    uom,
    scanned_qty: scannedQty,
    resolved_base_qty: resolvedBaseQty,
    outcome,
    exception_code: exceptionCode,
  })

  if (error) throw new Error(`[receivingService] recordScan failed: ${error.message}`)

  // ── Step 4: auto-create exception record and link back to scan ──────────
  if (outcome === "exception" && exceptionCode) {
    const exResult = await createReceivingException(db, tenantId, sessionId, shipmentId, exceptionCode, {
      barcode,
      sku,
      expectedQty,
      receivedQty: resolvedBaseQty,
      notes: `Auto-raised from scan ${scanId}`,
      scanId,
    }).catch((err) => {
      console.error("[receivingService] Exception creation failed:", err)
      return null
    })

    // Back-link the scan to its exception
    if (exResult) {
      await db
        .from("receiving_scans")
        .update({ exception_id: exResult.exceptionId })
        .eq("id", scanId)
        .then(null, (err: unknown) => console.error("[receivingService] Failed to link exception to scan:", err))
    }
  }

  return { scanId, outcome, resolvedSku: sku, resolvedBaseQty, expectedQty, exceptionCode }
}

/**
 * Post a matched or unmatched scan to the inventory ledger.
 * Writes a "receive" movement and marks the scan as "posted".
 *
 * Only scans in outcome = 'matched' or 'unmatched' can be posted.
 * Exception scans must be resolved first.
 */
export async function postReceivingScanToLedger(
  db: SupabaseClient,
  tenantId: string,
  scanId: string,
  actorId?: string | null
): Promise<{ movementId: string; resolvedQty: number }> {
  const { data: scan, error: fetchErr } = await db
    .from("receiving_scans")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", scanId)
    .single()

  if (fetchErr || !scan) throw new Error(`[receivingService] Scan ${scanId} not found`)
  if (scan.outcome === "posted") throw new Error(`[receivingService] Scan ${scanId} already posted`)
  if (scan.outcome === "exception") throw new Error(`[receivingService] Scan ${scanId} has unresolved exception`)
  if (!scan.inventory_item_id) throw new Error(`[receivingService] Scan ${scanId} has no inventory_item_id — create item first`)
  if (!scan.resolved_base_qty || scan.resolved_base_qty <= 0) {
    throw new Error(`[receivingService] Scan ${scanId} has no resolved_base_qty`)
  }

  // Received inventory lands at the staging location for this shipment.
  // Putaway tasks will later move it from staging → final storage location.
  const stagingLoc = buildStagingLocation(scan.inbound_shipment_id)

  const { movementId, resolvedQty } = await createInventoryMovement(db, {
    tenantId,
    inventoryItemId: scan.inventory_item_id,
    movementType: "receive",
    qty: scan.resolved_base_qty,
    toLocation: stagingLoc,
    referenceId: scan.session_id,
    referenceType: "receiving_session",
    actorId: actorId ?? null,
    note: `Receiving scan ${scan.id}${scan.barcode ? ` · barcode:${scan.barcode}` : ""}${scan.sku ? ` · SKU:${scan.sku}` : ""} → ${stagingLoc}`,
  })

  // Mark scan as posted
  await db
    .from("receiving_scans")
    .update({ outcome: "posted", movement_id: movementId })
    .eq("id", scanId)

  return { movementId, resolvedQty }
}

/**
 * Finalize a receiving session.
 * - Sets status to "completed" and records closed_at
 * - Raises shortage exceptions for any expected SKU not fully received
 * - Returns the session summary
 */
export async function finalizeReceivingSession(
  db: SupabaseClient,
  tenantId: string,
  sessionId: string,
  _actorId?: string | null
): Promise<ReceivingSessionSummary> {
  const { data: session, error: sessErr } = await db
    .from("receiving_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", sessionId)
    .single()

  if (sessErr || !session) throw new Error(`[receivingService] Session ${sessionId} not found`)
  if (session.status === "completed") {
    return summarizeReceivingSession(db, tenantId, sessionId)
  }

  // Compute received quantities from posted scans
  const { data: postedScans } = await db
    .from("receiving_scans")
    .select("sku, resolved_base_qty")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)
    .eq("outcome", "posted")

  const receivedBySku: Record<string, number> = {}
  for (const scan of postedScans ?? []) {
    if (scan.sku) {
      receivedBySku[scan.sku] = (receivedBySku[scan.sku] ?? 0) + (scan.resolved_base_qty ?? 0)
    }
  }

  // Check for shortages vs manifest
  const expectedBySku = await _expectedBySku(db, session.inbound_shipment_id)

  for (const [sku, expectedQty] of Object.entries(expectedBySku)) {
    const receivedQty = receivedBySku[sku] ?? 0
    if (receivedQty < expectedQty) {
      await createReceivingException(db, tenantId, sessionId, session.inbound_shipment_id, "shortage", {
        sku,
        expectedQty,
        receivedQty,
        notes: `Auto-raised on session close: expected ${expectedQty}, received ${receivedQty}`,
      }).catch((err) =>
        console.error("[receivingService] Shortage exception creation failed:", err)
      )
    }
  }

  // Close session
  await db
    .from("receiving_sessions")
    .update({ status: "completed", closed_at: new Date().toISOString() })
    .eq("id", sessionId)

  return summarizeReceivingSession(db, tenantId, sessionId)
}

/**
 * Create a receiving exception record.
 */
export async function createReceivingException(
  db: SupabaseClient,
  tenantId: string,
  sessionId: string,
  shipmentId: string,
  exceptionType: ExceptionType,
  details: {
    barcode?: string | null
    sku?: string | null
    expectedQty?: number | null
    receivedQty?: number | null
    notes?: string | null
    createdByUserId?: string | null
    scanId?: string | null
  } = {}
): Promise<{ exceptionId: string }> {
  const exceptionId = genId("EXC")
  const { error } = await db.from("receiving_exceptions").insert({
    id: exceptionId,
    tenant_id: tenantId,
    session_id: sessionId,
    inbound_shipment_id: shipmentId,
    exception_type: exceptionType,
    barcode: details.barcode ?? null,
    sku: details.sku ?? null,
    expected_qty: details.expectedQty ?? null,
    received_qty: details.receivedQty ?? null,
    status: "open",
    notes: details.notes ?? null,
    created_by_user_id: details.createdByUserId ?? null,
    scan_id: details.scanId ?? null,
  })

  if (error) throw new Error(`[receivingService] createException failed: ${error.message}`)

  return { exceptionId }
}

/**
 * Compute expected vs received reconciliation for a session.
 */
export async function summarizeReceivingSession(
  db: SupabaseClient,
  tenantId: string,
  sessionId: string
): Promise<ReceivingSessionSummary> {
  const { data: sessionRow } = await db
    .from("receiving_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", sessionId)
    .single()

  if (!sessionRow) throw new Error(`[receivingService] Session ${sessionId} not found`)

  const session: ReceivingSession = {
    id: sessionRow.id,
    tenantId: sessionRow.tenant_id,
    inboundShipmentId: sessionRow.inbound_shipment_id,
    operatorUserId: sessionRow.operator_user_id,
    status: sessionRow.status,
    startedAt: sessionRow.started_at,
    closedAt: sessionRow.closed_at,
    notes: sessionRow.notes,
  }

  const { data: scans } = await db
    .from("receiving_scans")
    .select("sku, resolved_base_qty, outcome")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)

  const totalScans = scans?.length ?? 0
  const postedScans = scans?.filter((s) => s.outcome === "posted").length ?? 0

  const receivedBySku: Record<string, number> = {}
  for (const scan of scans ?? []) {
    if (scan.sku && scan.outcome === "posted") {
      receivedBySku[scan.sku] = (receivedBySku[scan.sku] ?? 0) + (scan.resolved_base_qty ?? 0)
    }
  }

  const expectedBySku = await _expectedBySku(db, session.inboundShipmentId)

  const reconciliation: Record<string, { expectedQty: number; receivedQty: number }> = {}
  const allSkus = new Set([...Object.keys(expectedBySku), ...Object.keys(receivedBySku)])
  for (const sku of allSkus) {
    reconciliation[sku] = {
      expectedQty: expectedBySku[sku] ?? 0,
      receivedQty: receivedBySku[sku] ?? 0,
    }
  }

  const { data: exceptionsRows } = await db
    .from("receiving_exceptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)
    .eq("status", "open")

  const openExceptions: ReceivingException[] = (exceptionsRows ?? []).map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    sessionId: r.session_id,
    inboundShipmentId: r.inbound_shipment_id,
    exceptionType: r.exception_type,
    barcode: r.barcode,
    sku: r.sku,
    expectedQty: r.expected_qty,
    receivedQty: r.received_qty,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
  }))

  return {
    session,
    totalScans,
    postedScans,
    exceptionCount: openExceptions.length,
    reconciliation,
    openExceptions,
  }
}
