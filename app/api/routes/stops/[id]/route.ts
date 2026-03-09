/**
 * PATCH /api/routes/stops/[id] — Trusted route stop update
 *
 * Enforces: auth → tenant → role → valid transition → admin write.
 * Dev-mode bypass active when NODE_ENV=development and no session.
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError,
  resolveAuth,
  requireTenantAccess,
  requireRole,
  requireString,
  requireOneOf,
  logAuditEvent,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"

const ROUTE_WRITE_ROLES = [
  "driver_dispatcher", "shipping_manager", "driver",
  "warehouse_manager", "business_owner", "platform_owner",
] as const

// Statuses match RouteStop.status in types/index.ts
const VALID_STOP_STATUSES = ["pending", "next", "completed", "issue"] as const

const VALID_STOP_TRANSITIONS: Record<string, string[]> = {
  pending: ["next", "completed", "issue"],
  next: ["completed", "issue", "pending"],
  completed: [],
  issue: ["pending"],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ROUTE_WRITE_ROLES])
    }

    const admin = createAdminClient()

    const { data: stop, error: fetchErr } = await admin
      .from("route_stops")
      .select("id, tenant_id, status")
      .eq("id", id)
      .single()

    if (fetchErr || !stop) return NextResponse.json({ error: "Route stop not found." }, { status: 404 })
    if (!devMode && stop.tenant_id !== tenantId) return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })

    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) {
      const newStatus = requireOneOf(body.status, VALID_STOP_STATUSES, "status")
      const allowed = VALID_STOP_TRANSITIONS[stop.status] ?? []
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid stop transition from '${stop.status}' to '${newStatus}'. Allowed: [${allowed.join(", ")}].` },
          { status: 422 }
        )
      }
      updates.status = newStatus
    }
    if (body.stopNumber !== undefined && typeof body.stopNumber === "number") updates.stop_number = body.stopNumber
    if (body.lat !== undefined && typeof body.lat === "number") updates.lat = body.lat
    if (body.lng !== undefined && typeof body.lng === "number") updates.lng = body.lng
    if (body.notes !== undefined) updates.notes = body.notes ?? null
    if (body.address !== undefined) updates.address = requireString(body.address, "address")
    if (body.packages !== undefined && typeof body.packages === "number") updates.packages = body.packages
    if (body.weightKg !== undefined && typeof body.weightKg === "number") updates.weight_kg = body.weightKg

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
    }

    const { error: updateErr } = await admin.from("route_stops").update(updates).eq("id", id)
    if (updateErr) {
      console.error("[api/routes/stops PATCH] DB error:", updateErr)
      return NextResponse.json({ error: "Failed to update route stop." }, { status: 500 })
    }
    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "route_stop.update", id, { fields: Object.keys(updates) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/routes/stops PATCH] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
