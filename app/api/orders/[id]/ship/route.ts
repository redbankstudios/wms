/**
 * POST /api/orders/[id]/ship — Finalize shipment with correct ledger behavior
 *
 * Allowed source statuses: packed (standard path), picking/processing (fast-ship)
 *
 * Stock impact rules:
 *   - If items were picked: their on_hand was already decremented at pick time.
 *     No duplicate ship movement is written for those items.
 *   - If items were NOT picked (express/fast-ship): a ship movement is written
 *     for the un-picked portion, and the corresponding reservation is unreserved.
 *   - If fully picked: no ship movements written at all (zero double-decrement risk).
 *
 * After this route completes:
 *   - order.status = "shipped"
 *   - shipment record has shipped_at populated
 *   - All inventory_reservations for this order are closed (status = fulfilled)
 *   - inventory_balances.reserved is reconciled correctly
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError,
  resolveAuth,
  requireTenantAccess,
  requireString,
  logAuditEvent,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { finalizeShipmentForOrder } from "@/lib/inventory/shippingService"

// Standard path: order must be packed.
// Fast-ship path: also accept picking/processing so dispatchers can ship without
// a separate pack confirmation step (warehouse flow is accelerated).
const SHIPPABLE_STATUSES = ["packed", "picking", "processing"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) requireTenantAccess(appUser!, tenantId)

    const admin = createAdminClient()

    // Fetch order and validate state
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, tenant_id, status")
      .eq("id", orderId)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
    if (!devMode && order.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }
    if (!SHIPPABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            `Cannot ship order in status '${order.status}'. ` +
            `Order must be in one of: [${SHIPPABLE_STATUSES.join(", ")}].`,
        },
        { status: 422 }
      )
    }

    // Finalize inventory: write ship movements for unpicked items, close reservations
    const { shipmentId, shipMovements } = await finalizeShipmentForOrder(admin, {
      tenantId,
      orderId,
      actorId: appUser?.id ?? null,
    })

    // Advance order to shipped
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "shipped" })
      .eq("id", orderId)

    if (updateErr) {
      console.error("[api/orders/ship] Failed to update order status:", updateErr)
      return NextResponse.json({ error: "Failed to advance order to shipped." }, { status: 500 })
    }

    await logAuditEvent(
      admin,
      tenantId,
      appUser?.id ?? null,
      "order.shipped",
      orderId,
      {
        shipmentId,
        shipMovementsWritten: shipMovements.length,
        fastShip: order.status !== "packed",
        previousStatus: order.status,
      }
    )

    return NextResponse.json({
      ok: true,
      shipmentId,
      shipMovements,
      fastShip: order.status !== "packed",
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders/ship] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
