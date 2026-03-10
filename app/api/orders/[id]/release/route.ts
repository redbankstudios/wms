/**
 * POST /api/orders/[id]/release
 *
 * Release all active inventory reservations for an order and return the order
 * to "pending" status.
 *
 * Only valid when the order is "allocated" (pre-pick). Once picking has begun
 * the order can still be cancelled (handled by the standard PATCH status route),
 * but that path does not automatically release remaining reserved stock —
 * this route is the clean pre-pick release path.
 *
 * Body shape:
 * {
 *   tenantId: string
 * }
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError,
  resolveAuth,
  requireTenantAccess,
  requireRole,
  requireString,
  logAuditEvent,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { releaseReservation } from "@/lib/inventory/fulfillmentService"

const RELEASE_ROLES = [
  "warehouse_manager",
  "shipping_manager",
  "business_owner",
  "platform_owner",
] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...RELEASE_ROLES])
    }

    const admin = createAdminClient()

    // Fetch order
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
    if (!["allocated", "picking"].includes(order.status)) {
      return NextResponse.json(
        {
          error: `Cannot release reservations for order in status '${order.status}'. Must be allocated or picking.`,
        },
        { status: 422 }
      )
    }

    // Release all active/partially-picked reservations
    const { released } = await releaseReservation(admin, {
      tenantId,
      orderId,
      actorId: appUser?.id ?? null,
    })

    // Return order to pending
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "pending" })
      .eq("id", orderId)

    if (updateErr) {
      console.error("[api/orders release] Failed to revert order status:", updateErr)
      return NextResponse.json({ error: "Reservations released but failed to revert order status." }, { status: 500 })
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "order.release", orderId, {
      releasedReservations: released,
    })

    return NextResponse.json({
      ok: true,
      orderId,
      releasedReservations: released,
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders release] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
