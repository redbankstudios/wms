/**
 * GET  /api/receiving/sessions/[id] — Get session summary
 * PATCH /api/receiving/sessions/[id] — Finalize (or pause/cancel) a session
 */
import { NextRequest, NextResponse } from "next/server"
import { AuthError, resolveAuth, requireTenantAccess, requireRole, requireString, logAuditEvent } from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import { summarizeReceivingSession, finalizeReceivingSession } from "@/lib/inventory/receivingService"

const RECEIVING_ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 })

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...RECEIVING_ROLES])
    }

    const admin = createAdminClient()
    const summary = await summarizeReceivingSession(admin, tenantId, sessionId)
    return NextResponse.json({ summary })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/sessions/[id] GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...RECEIVING_ROLES])
    }

    const admin = createAdminClient()
    const action: string = body.action ?? "finalize"

    if (action === "finalize") {
      const summary = await finalizeReceivingSession(admin, tenantId, sessionId, appUser?.id ?? null)
      await logAuditEvent(admin, tenantId, appUser?.id ?? null, "receiving.session.finalize", sessionId, {
        postedScans: summary.postedScans,
        exceptions: summary.exceptionCount,
      })
      return NextResponse.json({ summary })
    }

    // pause or cancel
    if (action === "pause" || action === "cancel") {
      const newStatus = action === "pause" ? "paused" : "cancelled"
      const { error } = await admin
        .from("receiving_sessions")
        .update({
          status: newStatus,
          ...(action === "cancel" ? { closed_at: new Date().toISOString() } : {}),
        })
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("[api/receiving/sessions/[id] PATCH] DB error:", error)
        return NextResponse.json({ error: "Failed to update session." }, { status: 500 })
      }

      await logAuditEvent(admin, tenantId, appUser?.id ?? null, `receiving.session.${action}`, sessionId)
      return NextResponse.json({ ok: true, status: newStatus })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/receiving/sessions/[id] PATCH]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
