/**
 * Receiving Exception Service — Phase 5
 *
 * SERVER-SIDE ONLY. Requires a Supabase admin client.
 *
 * Responsibilities:
 *   - List, approve, reject, resolve receiving exceptions
 *   - Resolve unknown barcodes → write to product_barcodes (barcode learning)
 *   - Re-post original scan to ledger after resolution when safe
 *   - Lightweight exception analytics
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { postReceivingScanToLedger } from "./receivingService"

// ── ID generator ──────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReceivingExceptionDetail {
  id: string
  tenantId: string
  sessionId: string
  inboundShipmentId: string
  exceptionType: string
  barcode: string | null
  sku: string | null
  expectedQty: number | null
  receivedQty: number | null
  status: string
  notes: string | null
  scanId: string | null
  resolvedProductId: string | null
  resolvedSku: string | null
  resolutionAction: string | null
  resolutionNotes: string | null
  createdByUserId: string | null
  resolvedByUserId: string | null
  approvedByUserId: string | null
  rejectedByUserId: string | null
  resolvedAt: string | null
  createdAt: string
  /** Populated when the exception was created by a scan */
  scan?: {
    id: string
    outcome: string
    scannedQty: number
    resolvedBaseQty: number | null
    movementId: string | null
  } | null
}

export interface ExceptionAnalytics {
  total: number
  open: number
  resolvedToday: number
  byType: Record<string, number>
  topUnknownBarcodes: Array<{ barcode: string; count: number }>
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listReceivingExceptions(
  db: SupabaseClient,
  tenantId: string,
  filters: {
    shipmentId?: string
    sessionId?: string
    status?: string
    exceptionType?: string
    limit?: number
  } = {}
): Promise<ReceivingExceptionDetail[]> {
  let query = db
    .from("receiving_exceptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100)

  if (filters.shipmentId) query = query.eq("inbound_shipment_id", filters.shipmentId)
  if (filters.sessionId)  query = query.eq("session_id", filters.sessionId)
  if (filters.status)     query = query.eq("status", filters.status)
  if (filters.exceptionType) query = query.eq("exception_type", filters.exceptionType)

  const { data, error } = await query
  if (error) throw new Error(`[receivingExceptionService] listExceptions: ${error.message}`)

  return (data ?? []).map(_mapRow)
}

// ── Get detail (with linked scan) ─────────────────────────────────────────────

export async function getReceivingException(
  db: SupabaseClient,
  tenantId: string,
  exceptionId: string
): Promise<ReceivingExceptionDetail | null> {
  const { data: row } = await db
    .from("receiving_exceptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", exceptionId)
    .single()

  if (!row) return null

  const detail = _mapRow(row)

  // Enrich with linked scan if available
  if (row.scan_id) {
    const { data: scan } = await db
      .from("receiving_scans")
      .select("id, outcome, scanned_qty, resolved_base_qty, movement_id")
      .eq("id", row.scan_id)
      .maybeSingle()

    if (scan) {
      detail.scan = {
        id: scan.id,
        outcome: scan.outcome,
        scannedQty: scan.scanned_qty,
        resolvedBaseQty: scan.resolved_base_qty,
        movementId: scan.movement_id,
      }
    }
  }

  return detail
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function approveReceivingException(
  db: SupabaseClient,
  tenantId: string,
  exceptionId: string,
  actorId?: string | null,
  notes?: string
): Promise<void> {
  const { error } = await db
    .from("receiving_exceptions")
    .update({
      status: "approved",
      approved_by_user_id: actorId ?? null,
      resolution_notes: notes ?? null,
      resolution_action: "stock_accepted",
    })
    .eq("tenant_id", tenantId)
    .eq("id", exceptionId)
    .eq("status", "open")  // only open exceptions can be approved

  if (error) throw new Error(`[receivingExceptionService] approve: ${error.message}`)
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectReceivingException(
  db: SupabaseClient,
  tenantId: string,
  exceptionId: string,
  actorId?: string | null,
  notes?: string
): Promise<void> {
  const { error } = await db
    .from("receiving_exceptions")
    .update({
      status: "rejected",
      rejected_by_user_id: actorId ?? null,
      resolution_notes: notes ?? null,
      resolution_action: "stock_rejected",
    })
    .eq("tenant_id", tenantId)
    .eq("id", exceptionId)

  if (error) throw new Error(`[receivingExceptionService] reject: ${error.message}`)
}

// ── Generic resolve ───────────────────────────────────────────────────────────

export async function resolveReceivingException(
  db: SupabaseClient,
  tenantId: string,
  exceptionId: string,
  options: {
    resolutionAction?: "stock_accepted" | "stock_rejected" | "dismissed"
    resolutionNotes?: string
    actorId?: string | null
  } = {}
): Promise<void> {
  const { error } = await db
    .from("receiving_exceptions")
    .update({
      status: "resolved",
      resolved_by_user_id: options.actorId ?? null,
      resolution_action: options.resolutionAction ?? "dismissed",
      resolution_notes: options.resolutionNotes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", exceptionId)

  if (error) throw new Error(`[receivingExceptionService] resolve: ${error.message}`)
}

// ── Unknown barcode resolution (barcode learning write-back) ──────────────────

/**
 * Resolve an unknown_barcode exception by registering the barcode in product_barcodes.
 *
 * Steps:
 *   1. Validate exception is unknown_barcode + open
 *   2. Call attachBarcodeToProduct (enforces uniqueness)
 *   3. Mark exception resolved with action = "barcode_saved"
 *   4. If repostScan = true and original scan was not yet posted → post to ledger
 */
export async function resolveUnknownBarcode(
  db: SupabaseClient,
  tenantId: string,
  exceptionId: string,
  options: {
    productId: string
    uomCode: string
    qtyPerUnit: number
    barcodeType?: string
    isPrimary?: boolean
    repostScan?: boolean
    resolutionNotes?: string
    actorId?: string | null
  }
): Promise<{ barcodeId: string; movementId?: string; reposted: boolean }> {
  // 1. Fetch and validate exception
  const { data: exc } = await db
    .from("receiving_exceptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", exceptionId)
    .single()

  if (!exc) throw new Error(`[receivingExceptionService] Exception ${exceptionId} not found`)
  if (exc.exception_type !== "unknown_barcode") {
    throw new Error(`[receivingExceptionService] Exception ${exceptionId} is not an unknown_barcode exception`)
  }
  if (exc.status !== "open") {
    throw new Error(`[receivingExceptionService] Exception ${exceptionId} is already ${exc.status}`)
  }
  if (!exc.barcode) {
    throw new Error(`[receivingExceptionService] Exception ${exceptionId} has no barcode value`)
  }

  // 2. Register barcode → product_barcodes
  const { barcodeId } = await attachBarcodeToProduct(db, tenantId, exc.barcode, options.productId, {
    uomCode: options.uomCode,
    qtyPerUnit: options.qtyPerUnit,
    barcodeType: options.barcodeType ?? "CODE128",
    isPrimary: options.isPrimary ?? false,
  })

  // 3. Resolve the exception
  const { error: resolveErr } = await db
    .from("receiving_exceptions")
    .update({
      status: "resolved",
      resolved_by_user_id: options.actorId ?? null,
      resolved_product_id: options.productId,
      resolution_action: "barcode_saved",
      resolution_notes: options.resolutionNotes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", exceptionId)

  if (resolveErr) throw new Error(`[receivingExceptionService] Failed to resolve exception: ${resolveErr.message}`)

  // 4. Optionally re-post the original scan to ledger
  let movementId: string | undefined
  let reposted = false

  if (options.repostScan && exc.scan_id) {
    // Fetch the original scan to check if it was already posted
    const { data: scan } = await db
      .from("receiving_scans")
      .select("id, outcome, inventory_item_id")
      .eq("id", exc.scan_id)
      .maybeSingle()

    if (scan && scan.outcome !== "posted" && scan.inventory_item_id) {
      // Update the scan's inventory_item_id if needed (barcode now resolved to a product)
      // and mark it ready to post
      await db
        .from("receiving_scans")
        .update({ outcome: "matched", exception_code: null })
        .eq("id", scan.id)

      try {
        const posted = await postReceivingScanToLedger(db, tenantId, scan.id, options.actorId ?? null)
        movementId = posted.movementId
        reposted = true

        // Update the exception to note repost
        await db
          .from("receiving_exceptions")
          .update({ resolution_action: "reposted" })
          .eq("id", exceptionId)
      } catch (postErr) {
        console.warn("[receivingExceptionService] Repost failed (scan likely missing inventory_item_id):", postErr)
      }
    }
  }

  return { barcodeId, movementId, reposted }
}

// ── Attach barcode to product ─────────────────────────────────────────────────

/**
 * Insert a new row into product_barcodes.
 * Enforces per-tenant uniqueness — throws if barcode already registered.
 */
export async function attachBarcodeToProduct(
  db: SupabaseClient,
  tenantId: string,
  barcode: string,
  productId: string,
  options: {
    uomCode: string
    qtyPerUnit: number
    barcodeType?: string
    isPrimary?: boolean
  }
): Promise<{ barcodeId: string }> {
  // Check uniqueness
  const { data: existing } = await db
    .from("product_barcodes")
    .select("id, product_id")
    .eq("tenant_id", tenantId)
    .eq("barcode", barcode)
    .maybeSingle()

  if (existing) {
    if (existing.product_id === productId) {
      // Already registered for this product — idempotent return
      return { barcodeId: existing.id }
    }
    throw new Error(
      `[receivingExceptionService] Barcode "${barcode}" is already registered to a different product (${existing.product_id}) in this tenant.`
    )
  }

  const barcodeId = genId("PB")
  const { error } = await db.from("product_barcodes").insert({
    id: barcodeId,
    tenant_id: tenantId,
    product_id: productId,
    barcode,
    barcode_type: options.barcodeType ?? "CODE128",
    uom_code: options.uomCode,
    quantity_per_unit: options.qtyPerUnit,
    is_primary: options.isPrimary ?? false,
  })

  if (error) throw new Error(`[receivingExceptionService] attachBarcode failed: ${error.message}`)

  return { barcodeId }
}

// ── Exception analytics ───────────────────────────────────────────────────────

export async function getExceptionAnalytics(
  db: SupabaseClient,
  tenantId: string,
  filters: { shipmentId?: string; sessionId?: string } = {}
): Promise<ExceptionAnalytics> {
  let query = db
    .from("receiving_exceptions")
    .select("exception_type, status, resolved_at")
    .eq("tenant_id", tenantId)

  if (filters.shipmentId) query = query.eq("inbound_shipment_id", filters.shipmentId)
  if (filters.sessionId)  query = query.eq("session_id", filters.sessionId)

  const { data } = await query
  const rows = data ?? []

  const today = new Date().toISOString().slice(0, 10)
  const byType: Record<string, number> = {}

  for (const row of rows) {
    byType[row.exception_type] = (byType[row.exception_type] ?? 0) + 1
  }

  // Unknown barcodes — find the most common unresolved ones
  let unknownBarcodeQuery = db
    .from("receiving_exceptions")
    .select("barcode")
    .eq("tenant_id", tenantId)
    .eq("exception_type", "unknown_barcode")
    .eq("status", "open")
    .not("barcode", "is", null)

  if (filters.shipmentId) unknownBarcodeQuery = unknownBarcodeQuery.eq("inbound_shipment_id", filters.shipmentId)

  const { data: unknownRows } = await unknownBarcodeQuery

  const barcodeCounts: Record<string, number> = {}
  for (const row of unknownRows ?? []) {
    if (row.barcode) barcodeCounts[row.barcode] = (barcodeCounts[row.barcode] ?? 0) + 1
  }
  const topUnknownBarcodes = Object.entries(barcodeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([barcode, count]) => ({ barcode, count }))

  return {
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    resolvedToday: rows.filter((r) => r.resolved_at?.startsWith(today)).length,
    byType,
    topUnknownBarcodes,
  }
}

// ── Internal mapper ───────────────────────────────────────────────────────────

function _mapRow(r: Record<string, unknown>): ReceivingExceptionDetail {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    sessionId: r.session_id as string,
    inboundShipmentId: r.inbound_shipment_id as string,
    exceptionType: r.exception_type as string,
    barcode: (r.barcode as string | null) ?? null,
    sku: (r.sku as string | null) ?? null,
    expectedQty: (r.expected_qty as number | null) ?? null,
    receivedQty: (r.received_qty as number | null) ?? null,
    status: r.status as string,
    notes: (r.notes as string | null) ?? null,
    scanId: (r.scan_id as string | null) ?? null,
    resolvedProductId: (r.resolved_product_id as string | null) ?? null,
    resolvedSku: (r.resolved_sku as string | null) ?? null,
    resolutionAction: (r.resolution_action as string | null) ?? null,
    resolutionNotes: (r.resolution_notes as string | null) ?? null,
    createdByUserId: (r.created_by_user_id as string | null) ?? null,
    resolvedByUserId: (r.resolved_by_user_id as string | null) ?? null,
    approvedByUserId: (r.approved_by_user_id as string | null) ?? null,
    rejectedByUserId: (r.rejected_by_user_id as string | null) ?? null,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    createdAt: r.created_at as string,
    scan: null,
  }
}
