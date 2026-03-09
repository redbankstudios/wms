/**
 * POST /api/routes/stops — Trusted route stop creation
 *
 * Enforces: auth → tenant (via parent route) → role → payload → admin write.
 * Dev-mode bypass active when NODE_ENV=development and no session.
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError,
  resolveAuth,
  requireTenantAccess,
  requireRole,
  requireString,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"

const ROUTE_WRITE_ROLES = [
  "driver_dispatcher", "shipping_manager", "warehouse_manager",
  "business_owner", "platform_owner",
] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")
    const routeId = requireString(body.routeId, "routeId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ROUTE_WRITE_ROLES])
    }

    const admin = createAdminClient()

    if (!devMode) {
      const { data: route } = await admin
        .from("routes")
        .select("tenant_id")
        .eq("id", routeId)
        .single()
      if (!route) return NextResponse.json({ error: "Route not found." }, { status: 404 })
      if (route.tenant_id !== tenantId) return NextResponse.json({ error: "Route tenant mismatch." }, { status: 403 })
    }

    const stopPayload: Record<string, unknown> = {
      route_id: routeId,
      tenant_id: tenantId,
      address: requireString(body.address, "address"),
      stop_number: typeof body.stopNumber === "number" ? body.stopNumber : 1,
      status: "pending",
      customer: body.customer ?? "",
      time: body.time ?? "",
      packages: typeof body.packages === "number" ? body.packages : 0,
    }
    if (body.id) stopPayload.id = body.id
    if (body.orderId) stopPayload.order_id = requireString(body.orderId, "orderId")
    if (body.lat !== undefined && typeof body.lat === "number") stopPayload.lat = body.lat
    if (body.lng !== undefined && typeof body.lng === "number") stopPayload.lng = body.lng
    if (body.weightKg !== undefined && typeof body.weightKg === "number") stopPayload.weight_kg = body.weightKg
    if (body.notes) stopPayload.notes = body.notes

    const { data, error } = await admin.from("route_stops").insert(stopPayload).select().single()
    if (error) {
      console.error("[api/routes/stops POST] DB error:", error)
      return NextResponse.json({ error: "Failed to create route stop." }, { status: 500 })
    }
    return NextResponse.json({ stop: data }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/routes/stops POST] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
