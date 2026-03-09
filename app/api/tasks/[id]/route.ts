/**
 * /api/tasks/[id] — Trusted task mutation endpoint
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

const TASK_WRITE_ROLES = [
  "warehouse_manager",
  "warehouse_employee",
  "packer",
  "business_owner",
  "platform_owner",
] as const

const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled", "pending"],
  completed: [],
  cancelled: ["pending"],
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
      requireRole(appUser!, [...TASK_WRITE_ROLES])
    }

    const admin = createAdminClient()

    const { data: task, error: fetchErr } = await admin
      .from("tasks")
      .select("id, tenant_id, status")
      .eq("id", id)
      .single()

    if (fetchErr || !task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 })
    }
    if (!devMode && task.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) {
      const newStatus = requireOneOf(body.status, VALID_STATUSES, "status")
      const allowed = VALID_TRANSITIONS[task.status] ?? []
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition from '${task.status}' to '${newStatus}'. Allowed: [${allowed.join(", ")}].` },
          { status: 422 }
        )
      }
      updates.status = newStatus
    }
    if (body.assigneeId !== undefined) {
      updates.assignee_id = body.assigneeId ?? null
      if (body.assigneeId) updates.assigned_at = new Date().toISOString()
    }
    if (body.assignee !== undefined) updates.assignee = body.assignee ?? ""
    if (body.priority !== undefined) {
      updates.priority = requireOneOf(body.priority, ["low", "medium", "high", "normal"] as const, "priority")
    }
    if (body.zone !== undefined) updates.zone = body.zone ?? null
    if (body.location !== undefined) updates.location = body.location ?? ""
    if (body.items !== undefined && typeof body.items === "number") updates.items = body.items
    if (body.type !== undefined) updates.type = body.type
    if (body.scheduledDate !== undefined) updates.scheduled_date = body.scheduledDate ?? null
    if (body.estimatedPackages !== undefined) updates.estimated_packages = body.estimatedPackages ?? null
    if (body.estimatedEffort !== undefined) updates.estimated_effort = body.estimatedEffort ?? null
    if (body.orderId !== undefined) updates.order_id = body.orderId ?? null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
    }

    const { error: updateErr } = await admin.from("tasks").update(updates).eq("id", id)
    if (updateErr) {
      console.error("[api/tasks PATCH] DB error:", updateErr)
      return NextResponse.json({ error: "Failed to update task." }, { status: 500 })
    }
    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "task.update", id, { fields: Object.keys(updates) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/tasks PATCH] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
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
      requireRole(appUser!, ["warehouse_manager", "business_owner", "platform_owner"])
    }

    const admin = createAdminClient()

    const { data: task, error: fetchErr } = await admin
      .from("tasks")
      .select("id, tenant_id, status")
      .eq("id", id)
      .single()

    if (fetchErr || !task) return NextResponse.json({ error: "Task not found." }, { status: 404 })
    if (!devMode && task.tenant_id !== tenantId) return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    if (task.status === "in_progress") {
      return NextResponse.json({ error: "Cannot delete an in-progress task. Cancel it first." }, { status: 422 })
    }

    const { error: deleteErr } = await admin.from("tasks").delete().eq("id", id)
    if (deleteErr) {
      console.error("[api/tasks DELETE] DB error:", deleteErr)
      return NextResponse.json({ error: "Failed to delete task." }, { status: 500 })
    }
    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "task.delete", id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/tasks DELETE] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
