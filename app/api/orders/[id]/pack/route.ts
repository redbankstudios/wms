/**
 * POST /api/orders/[id]/pack — Confirm pack for an order
 *
 * Allowed source statuses: picking, processing
 * Result: order.status → "packed", shipment record created/updated with packed_at
 *
 * No inventory balance change — pack is administrative only.
 * Stock impact happens at ship time via /api/orders/[id]/ship.
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
import { confirmPackForOrder } from "@/lib/inventory/shippingService"

const PACKABLE_STATUSES = ["picking", "processing"]

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
    if (!PACKABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          error: `Cannot confirm pack for order in status '${order.status}'. ` +
            `Order must be in one of: [${PACKABLE_STATUSES.join(", ")}].`,
        },
        { status: 422 }
      )
    }

    // Create/update shipment record with pack metadata (no stock change)
    const { shipmentId } = await confirmPackForOrder(admin, {
      tenantId,
      orderId,
      actorId: appUser?.id ?? null,
    })

    // Advance order to packed
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "packed" })
      .eq("id", orderId)

    if (updateErr) {
      console.error("[api/orders/pack] Failed to update order status:", updateErr)
      return NextResponse.json({ error: "Failed to advance order to packed." }, { status: 500 })
    }

    await logAuditEvent(
      admin,
      tenantId,
      appUser?.id ?? null,
      "order.pack_confirmed",
      orderId,
      { shipmentId, previousStatus: order.status }
    )

    return NextResponse.json({ ok: true, shipmentId })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders/pack] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
