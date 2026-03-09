/**
 * POST /api/receiving/sessions — Open a receiving session
 *
 * Body: { tenantId, shipmentId, operatorUserId?, notes? }
 * Returns: { sessionId }
 */
import { NextRequest, NextResponse } from "next/server"
import { AuthError, resolveAuth, requireTenantAccess, requireRole, requireString, logAuditEvent } from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { openReceivingSession } from "@/lib/inventory/receivingService"

const RECEIVING_ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId  = requireString(body.tenantId, "tenantId")
    const shipmentId = requireString(body.shipmentId, "shipmentId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...RECEIVING_ROLES])
    }

    const admin = createAdminClient()

    // Verify shipment belongs to tenant
    const { data: shipment } = await admin
      .from("inbound_shipments")
      .select("id, tenant_id, status")
      .eq("id", shipmentId)
      .single()

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }
    if (!devMode && shipment.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    const { sessionId } = await openReceivingSession(
      admin,
      tenantId,
      shipmentId,
      body.operatorUserId ?? appUser?.id ?? null,
      body.notes
    )

    // Update shipment status to "receiving" if it's not already
    if (shipment.status !== "receiving" && shipment.status !== "complete") {
      await admin
        .from("inbound_shipments")
        .update({ status: "receiving" })
        .eq("id", shipmentId)
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "receiving.session.open", sessionId, { shipmentId })
    return NextResponse.json({ sessionId }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/sessions POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
