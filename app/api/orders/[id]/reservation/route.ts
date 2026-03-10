/**
 * GET /api/orders/[id]/reservation?tenantId=...
 *
 * Returns the reservation summary for an order: all reservation lines,
 * their picked/reserved counts, and current inventory balances.
 *
 * Used by the Orders UI to show allocation status in the expanded order panel.
 */
import { NextRequest, NextResponse } from "next/server"
import { AuthError, resolveAuth, requireTenantAccess } from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { getOrderReservationSummary } from "@/lib/inventory/fulfillmentService"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const tenantId = request.nextUrl.searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId query param." }, { status: 400 })
    }

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) requireTenantAccess(appUser!, tenantId)

    const admin = createAdminClient()

    // Verify order belongs to tenant
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, tenant_id")
      .eq("id", orderId)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
    if (!devMode && order.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    const summary = await getOrderReservationSummary(admin, tenantId, orderId)

    return NextResponse.json(summary)
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders reservation] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
