/**
 * PATCH /api/returns/[id] — Trusted return disposition update
 *
 * Enforces: auth → tenant → role → payload → admin write.
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

const RETURNS_WRITE_ROLES = [
  "warehouse_manager",
  "warehouse_employee",
  "shipping_manager",
  "business_owner",
  "platform_owner",
] as const

// Statuses match Return.status in types/index.ts
const VALID_STATUSES = ["pending", "inspecting", "completed", "restocked", "disposed", "returned_to_vendor"] as const
const VALID_DISPOSITIONS = ["restock", "dispose", "return_to_vendor", "quarantine", "-"] as const

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
      requireRole(appUser!, [...RETURNS_WRITE_ROLES])
    }

    const admin = createAdminClient()

    const { data: ret, error: fetchErr } = await admin
      .from("returns")
      .select("id, tenant_id, status")
      .eq("id", id)
      .single()

    if (fetchErr || !ret) {
      return NextResponse.json({ error: "Return not found." }, { status: 404 })
    }
    if (!devMode && ret.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) {
      updates.status = requireOneOf(body.status, VALID_STATUSES, "status")
    }
    if (body.disposition !== undefined) {
      updates.disposition = requireOneOf(body.disposition, VALID_DISPOSITIONS, "disposition")
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
    }

    const { error: updateErr } = await admin.from("returns").update(updates).eq("id", id)

    if (updateErr) {
      console.error("[api/returns PATCH] DB error:", updateErr)
      return NextResponse.json({ error: "Failed to update return." }, { status: 500 })
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "return.update", id, { updates })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/returns PATCH] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
