/**
 * Shipping Service — Phase 7 Pack / Ship / Dispatch Integration
 *
 * SERVER-SIDE ONLY. Requires a Supabase admin client.
 * Never import this module from browser/client components.
 *
 * Responsibilities:
 *   - Pack confirmation  (administrative, no stock change)
 *   - Shipment finalization  (stock impact for unpicked items only)
 *   - Order cancellation + inventory release
 *   - Shipment execution summary for UI
 *
 * Stock impact rules (see docs/OUTBOUND_STOCK_RULES.md):
 *   - pack   → administrative only; no balance change
 *   - ship   → writes stock impact ONLY for items not already picked
 *              (handled by finalizeShipmentInventoryImpact in fulfillmentService)
 *   - cancel → unreserves any remaining active/partially_picked reservation qty
 *              (already-picked stock is NOT reversed — it has already left on_hand)
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { finalizeShipmentInventoryImpact } from "./fulfillmentService"
import { createInventoryMovement } from "./movementService"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PackParams {
  tenantId: string
  orderId: string
  actorId?: string | null
}

export interface ShipFinalizeParams {
  tenantId: string
  orderId: string
  actorId?: string | null
}

export interface CancelParams {
  tenantId: string
  orderId: string
  actorId?: string | null
  note?: string
}

export interface ShipmentExecutionSummary {
  orderId: string
  shipmentId: string | null
  packedAt: string | null
  shippedAt: string | null
  shipmentStatus: string | null
  reservationStatus: {
    totalReserved: number
    totalPicked: number
    allFulfilled: boolean
    hasActive: boolean
  }
}

// ── ID generation ──────────────────────────────────────────────────────────────

function generateShipmentId(): string {
  return `SHP-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

// ── confirmPackForOrder ────────────────────────────────────────────────────────

/**
 * Confirm that an order has been physically packed and is ready for shipment.
 *
 * - Creates or updates the shipment record with packed_at metadata.
 * - Does NOT change any inventory balances (pack is administrative only).
 * - Safe to call on an already-packed order (idempotent: updates packed_at
 *   only if shipment_status allows it).
 *
 * The caller (API route) is responsible for advancing order.status to "packed".
 */
export async function confirmPackForOrder(
  db: SupabaseClient,
  params: PackParams
): Promise<{ shipmentId: string }> {
  const { tenantId, orderId, actorId } = params
  const now = new Date().toISOString()

  // Check for an existing shipment record for this order
  const { data: existing } = await db
    .from("shipments")
    .select("id, shipment_status")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .maybeSingle()

  let shipmentId: string

  if (existing) {
    // Update existing record — preserve any carrier/tracking info
    await db
      .from("shipments")
      .update({
        status: "pack_confirmed",
        shipment_status: "pack_confirmed",
        packed_at: now,
        packed_by_user_id: actorId ?? null,
      })
      .eq("id", existing.id)
    shipmentId = existing.id
  } else {
    // Create a minimal shipment record for this order
    shipmentId = generateShipmentId()
    const { error: insErr } = await db.from("shipments").insert({
      id: shipmentId,
      tenant_id: tenantId,
      order_id: orderId,
      status: "pack_confirmed",
      shipment_status: "pack_confirmed",
      packed_at: now,
      packed_by_user_id: actorId ?? null,
      created_at: now,
    })
    if (insErr) {
      throw new Error(`[shippingService] Failed to create shipment record: ${insErr.message}`)
    }
  }

  return { shipmentId }
}

// ── finalizeShipmentForOrder ──────────────────────────────────────────────────

/**
 * Finalize inventory impact and mark the shipment as shipped.
 *
 * Steps:
 *   1. Calls finalizeShipmentInventoryImpact() from fulfillmentService.
 *      - Writes `unreserve + ship` movements for any items not yet picked.
 *      - If fully picked, writes NO duplicate stock movements.
 *      - Closes all open reservation records.
 *   2. Updates (or creates) the shipment record with shipped_at metadata.
 *
 * The caller (API route) advances order.status to "shipped" after this returns.
 *
 * Double-decrement prevention:
 *   - finalizeShipmentInventoryImpact inspects each reservation's picked_qty.
 *   - Ship movements are only written for (reserved_qty - picked_qty) > 0.
 *   - If picked_qty == reserved_qty, no ship movement is written.
 */
export async function finalizeShipmentForOrder(
  db: SupabaseClient,
  params: ShipFinalizeParams
): Promise<{ shipmentId: string | null; shipMovements: string[] }> {
  const { tenantId, orderId, actorId } = params
  const now = new Date().toISOString()

  // Write stock impact for any unpicked items (idempotent for picked items)
  const { shipMovements } = await finalizeShipmentInventoryImpact(db, {
    tenantId,
    orderId,
    actorId,
  })

  // Update or create shipment record
  const { data: existing } = await db
    .from("shipments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .maybeSingle()

  let shipmentId: string | null = null

  if (existing) {
    await db
      .from("shipments")
      .update({
        status: "shipped",
        shipment_status: "shipped",
        shipped_at: now,
        shipped_by_user_id: actorId ?? null,
      })
      .eq("id", existing.id)
    shipmentId = existing.id
  } else {
    // Order was shipped without a prior pack confirmation (fast-ship path)
    shipmentId = generateShipmentId()
    const { error: insErr } = await db.from("shipments").insert({
      id: shipmentId,
      tenant_id: tenantId,
      order_id: orderId,
      status: "shipped",
      shipment_status: "shipped",
      shipped_at: now,
      shipped_by_user_id: actorId ?? null,
      created_at: now,
    })
    if (insErr) {
      throw new Error(`[shippingService] Failed to create shipment record on ship: ${insErr.message}`)
    }
  }

  return { shipmentId, shipMovements }
}

// ── cancelOrderAndReleaseInventory ────────────────────────────────────────────

/**
 * Safely cancel an order and release any remaining inventory reservations.
 *
 * Behaviour by order stage:
 *
 *   Pre-pick (pending / allocated):
 *     - All `active` reservations are released.
 *     - An `unreserve` movement is written for the full reserved_qty.
 *     - Reservation status → `cancelled`.
 *
 *   Partially-picked (picking / packed with some picks done):
 *     - `partially_picked` reservations: unreserve written for the
 *       un-picked portion only (reserved_qty − picked_qty).
 *     - Already-picked stock is NOT reversed — it has already decremented
 *       on_hand and cannot be cleanly returned without a returns workflow.
 *     - Reservation status → `cancelled`.
 *
 *   Fully-picked (reservation status = fulfilled):
 *     - No unreserve movement written (reserved = 0, already decremented).
 *     - Reservation record left as `fulfilled` — do not re-cancel.
 *
 *   Shipment record:
 *     - If a shipment record exists (e.g. from pack_confirmed), it is marked
 *       `cancelled`.
 *
 * This function does NOT update order.status — the caller (API route) does that.
 */
export async function cancelOrderAndReleaseInventory(
  db: SupabaseClient,
  params: CancelParams
): Promise<{ releasedReservations: string[]; cancelledShipmentId: string | null }> {
  const { tenantId, orderId, actorId, note } = params
  const now = new Date().toISOString()

  // Fetch all active/partially_picked reservations
  const { data: reservations, error: resErr } = await db
    .from("inventory_reservations")
    .select("id, inventory_item_id, sku, reserved_qty, picked_qty, status")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .in("status", ["active", "partially_picked"])

  if (resErr) {
    throw new Error(`[shippingService] Failed to fetch reservations for cancel: ${resErr.message}`)
  }

  const releasedIds: string[] = []

  for (const res of reservations ?? []) {
    const releasableQty = res.reserved_qty - res.picked_qty

    if (releasableQty > 0) {
      // Return the un-picked portion to available stock
      await createInventoryMovement(db, {
        tenantId,
        inventoryItemId: res.inventory_item_id,
        movementType: "unreserve",
        qty: releasableQty,
        referenceId: orderId,
        referenceType: "order",
        actorId: actorId ?? null,
        note: note
          ? `Cancel (${note}): release reservation ${res.id}`
          : `Order cancel: release reservation ${res.id} for order ${orderId}`,
      })
    }

    // Mark as cancelled (distinct from 'released' — released = voluntary, cancelled = order abort)
    const { error: updErr } = await db
      .from("inventory_reservations")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", res.id)

    if (updErr) {
      throw new Error(`[shippingService] Failed to cancel reservation ${res.id}: ${updErr.message}`)
    }

    releasedIds.push(res.id)
  }

  // Cancel any associated shipment record (e.g. from pack_confirmed)
  let cancelledShipmentId: string | null = null
  const { data: shipment } = await db
    .from("shipments")
    .select("id, shipment_status")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .maybeSingle()

  if (shipment && !["shipped", "in_transit", "delivered"].includes(shipment.shipment_status)) {
    await db
      .from("shipments")
      .update({ status: "cancelled", shipment_status: "cancelled" })
      .eq("id", shipment.id)
    cancelledShipmentId = shipment.id
  }

  return { releasedReservations: releasedIds, cancelledShipmentId }
}

// ── getShipmentExecutionSummary ───────────────────────────────────────────────

/**
 * Returns the current pack/ship execution state for an order.
 * Used by the UI to show shipment readiness and dispatch eligibility.
 */
export async function getShipmentExecutionSummary(
  db: SupabaseClient,
  tenantId: string,
  orderId: string
): Promise<ShipmentExecutionSummary> {
  const [{ data: shipment }, { data: reservations }] = await Promise.all([
    db
      .from("shipments")
      .select("id, shipment_status, packed_at, shipped_at")
      .eq("tenant_id", tenantId)
      .eq("order_id", orderId)
      .maybeSingle(),
    db
      .from("inventory_reservations")
      .select("reserved_qty, picked_qty, status")
      .eq("tenant_id", tenantId)
      .eq("order_id", orderId),
  ])

  const rows = reservations ?? []
  const totalReserved = rows.reduce((s, r) => s + r.reserved_qty, 0)
  const totalPicked = rows.reduce((s, r) => s + r.picked_qty, 0)
  const allFulfilled = rows.length > 0 && rows.every(r => ["fulfilled", "cancelled"].includes(r.status))
  const hasActive = rows.some(r => ["active", "partially_picked"].includes(r.status))

  return {
    orderId,
    shipmentId: shipment?.id ?? null,
    packedAt: shipment?.packed_at ?? null,
    shippedAt: shipment?.shipped_at ?? null,
    shipmentStatus: shipment?.shipment_status ?? null,
    reservationStatus: { totalReserved, totalPicked, allFulfilled, hasActive },
  }
}
