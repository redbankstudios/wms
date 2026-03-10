/**
 * GET  /api/inbound/[id]/putaway  — Putaway status for a shipment
 * POST /api/inbound/[id]/putaway  — Generate putaway tasks from the latest
 *                                   completed receiving session for the shipment
 *
 * [id] = inbound_shipment.id
 *
 * GET query params: ?tenantId=...
 *
 * POST body:
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
import {
  generatePutawayTasks,
  getPutawayStatusForShipment,
  findLatestCompletedSession,
} from "@/lib/inventory/putawayService"

const PUTAWAY_ROLES = [
  "warehouse_manager",
  "warehouse_employee",
  "business_owner",
  "platform_owner",
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required." }, { status: 400 })
    }

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...PUTAWAY_ROLES])
    }

    const admin = createAdminClient()
    const status = await getPutawayStatusForShipment(admin, tenantId, shipmentId)

    return NextResponse.json({ status })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inbound/putaway GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...PUTAWAY_ROLES])
    }

    const admin = createAdminClient()

    // Validate shipment belongs to tenant
    const { data: shipment, error: shipErr } = await admin
      .from("inbound_shipments")
      .select("id, tenant_id, status")
      .eq("id", shipmentId)
      .single()

    if (shipErr || !shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 })
    }
    if (!devMode && shipment.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    // Find the latest completed session for this shipment
    const sessionId = await findLatestCompletedSession(admin, tenantId, shipmentId)
    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "No completed receiving session found for this shipment. " +
            "Finalize a receiving session before generating putaway tasks.",
        },
        { status: 422 }
      )
    }

    const result = await generatePutawayTasks(
      admin,
      tenantId,
      sessionId,
      shipmentId,
      appUser?.id ?? null
    )

    await logAuditEvent(
      admin,
      tenantId,
      appUser?.id ?? null,
      "putaway.tasks.generate",
      shipmentId,
      { sessionId, ...result }
    )

    return NextResponse.json({
      ok: true,
      shipmentId,
      sessionId,
      ...result,
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inbound/putaway POST]", err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    )
  }
}
