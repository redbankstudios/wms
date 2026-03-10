/**
 * POST /api/orders/[id]/cancel — Cancel an order and release inventory
 *
 * Allowed source statuses: pending, allocated, picking, processing, packed
 * Terminal statuses (cancelled, returned, delivered, shipped) are rejected.
 *
 * Cancel behaviour by stage (see docs/CANCELLATION_AND_RELEASE_RULES.md):
 *
 *   pending / allocated (no picks):
 *     → Full unreserve for all active reservation lines.
 *     → Reservation status = cancelled.
 *
 *   picking / packed (partial or full pick complete):
 *     → Unreserve the un-picked portion of each partially_picked reservation.
 *     → Already-picked stock is NOT reversed (no reverse-pick movement).
 *     → Reservation status = cancelled.
 *
 *   Shipment record (if exists from pack_confirmed):
 *     → Marked cancelled.
 *
 * After this route completes: order.status = "cancelled".
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
import { cancelOrderAndReleaseInventory } from "@/lib/inventory/shippingService"

const TERMINAL_STATUSES = ["cancelled", "returned", "delivered", "shipped", "in_transit"]
const CANCELLABLE_STATUSES = ["pending", "allocated", "picking", "processing", "packed"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")
    const note = typeof body.note === "string" ? body.note : undefined

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
    if (TERMINAL_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            `Order is in terminal status '${order.status}' and cannot be cancelled. ` +
            `Only pre-ship orders can be cancelled.`,
        },
        { status: 422 }
      )
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            `Cannot cancel order in status '${order.status}'. ` +
            `Cancellable statuses: [${CANCELLABLE_STATUSES.join(", ")}].`,
        },
        { status: 422 }
      )
    }

    // Release inventory and cancel shipment record
    const { releasedReservations, cancelledShipmentId } =
      await cancelOrderAndReleaseInventory(admin, {
        tenantId,
        orderId,
        actorId: appUser?.id ?? null,
        note,
      })

    // Advance order to cancelled
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)

    if (updateErr) {
      console.error("[api/orders/cancel] Failed to cancel order:", updateErr)
      return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 })
    }

    await logAuditEvent(
      admin,
      tenantId,
      appUser?.id ?? null,
      "order.cancelled",
      orderId,
      {
        previousStatus: order.status,
        releasedReservations,
        cancelledShipmentId,
        note: note ?? null,
      }
    )

    return NextResponse.json({
      ok: true,
      releasedReservations,
      cancelledShipmentId,
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders/cancel] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
