/**
 * POST /api/inbound — Trusted inbound shipment creation endpoint
 *
 * Enforces: auth → tenant → role → payload → admin write.
 * Dev-mode bypass active when NODE_ENV=development and no session.
 *
 * Inbound receiving is a high-integrity workflow: items received here directly
 * affect inventory counts. This route is the trusted entry point for that chain.
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError,
  resolveAuth,
  requireTenantAccess,
  requireRole,
  requireString,
  requireOneOf,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"

const INBOUND_CREATE_ROLES = [
  "warehouse_manager",
  "warehouse_employee",
  "business_owner",
  "platform_owner",
] as const

const VALID_STATUSES = [
  "scheduled", "arrived", "receiving", "received", "discrepancy", "cancelled",
] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...INBOUND_CREATE_ROLES])
    }

    const status = body.status
      ? requireOneOf(body.status, VALID_STATUSES, "status")
      : "scheduled"

    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      client_id: requireString(body.clientId, "clientId"),
      reference_number: requireString(body.referenceNumber, "referenceNumber"),
      carrier: body.carrier ?? "",
      status,
      arrival_date: requireString(body.arrivalDate, "arrivalDate"),
      arrival_window_start: body.arrivalWindowStart ?? null,
      arrival_window_end: body.arrivalWindowEnd ?? null,
      dock_door: body.dockDoor ?? null,
      notes: body.notes ?? null,
      total_pallets: typeof body.totalPallets === "number" ? body.totalPallets : 0,
    }
    if (body.id) payload.id = body.id

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("inbound_shipments")
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error("[api/inbound POST] DB error:", error)
      return NextResponse.json({ error: "Failed to create inbound shipment." }, { status: 500 })
    }

    return NextResponse.json({ shipment: data }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inbound POST] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── PATCH /api/inbound — Update inbound shipment status ─────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["arrived", "cancelled"],
  arrived: ["receiving", "cancelled"],
  receiving: ["received", "discrepancy"],
  received: [],    // terminal
  discrepancy: ["receiving", "received", "cancelled"],
  cancelled: [],   // terminal
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = requireString(body.id, "id")
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...INBOUND_CREATE_ROLES])
    }

    const admin = createAdminClient()

    const { data: shipment, error: fetchErr } = await admin
      .from("inbound_shipments")
      .select("id, tenant_id, status")
      .eq("id", id)
      .single()

    if (fetchErr || !shipment) {
      return NextResponse.json({ error: "Inbound shipment not found." }, { status: 404 })
    }
    if (!devMode && shipment.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) {
      const newStatus = requireOneOf(body.status, VALID_STATUSES, "status")
      const allowed = VALID_TRANSITIONS[shipment.status] ?? []
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Invalid transition from '${shipment.status}' to '${newStatus}'. Allowed: [${allowed.join(", ")}].`,
          },
          { status: 422 }
        )
      }
      updates.status = newStatus
    }
    if (body.dockDoor !== undefined) updates.dock_door = body.dockDoor ?? null
    if (body.notes !== undefined) updates.notes = body.notes ?? null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
    }

    const { error: updateErr } = await admin
      .from("inbound_shipments")
      .update(updates)
      .eq("id", id)

    if (updateErr) {
      console.error("[api/inbound PATCH] DB error:", updateErr)
      return NextResponse.json({ error: "Failed to update inbound shipment." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inbound PATCH] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
