/**
 * GET /api/receiving/exceptions — List exceptions with analytics
 *
 * Query params: tenantId (required), shipmentId?, sessionId?, status?, exceptionType?
 * Returns: { exceptions, analytics }
 */
import { NextRequest, NextResponse } from "next/server"
import { AuthError, resolveAuth, requireTenantAccess, requireRole } from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { listReceivingExceptions, getExceptionAnalytics } from "@/lib/inventory/receivingExceptionService"

const ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 })

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ROLES])
    }

    const admin = createAdminClient()
    const filters = {
      shipmentId: searchParams.get("shipmentId") ?? undefined,
      sessionId: searchParams.get("sessionId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      exceptionType: searchParams.get("exceptionType") ?? undefined,
    }

    const [exceptions, analytics] = await Promise.all([
      listReceivingExceptions(admin, tenantId, filters),
      getExceptionAnalytics(admin, tenantId, {
        shipmentId: filters.shipmentId,
        sessionId: filters.sessionId,
      }),
    ])

    return NextResponse.json({ exceptions, analytics })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/exceptions GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
