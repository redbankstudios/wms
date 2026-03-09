/**
 * POST /api/tasks — Trusted task creation endpoint
 *
 * Enforces: auth → tenant → role → payload shape → write via admin client.
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
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"

const TASK_CREATE_ROLES = [
  "warehouse_manager",
  "warehouse_employee",
  "business_owner",
  "platform_owner",
] as const

const VALID_TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const
const VALID_TASK_TYPES = [
  "pick", "pack", "putaway", "receive", "count", "replenish",
  "quality_check", "return_processing", "move", "label",
] as const
const VALID_PRIORITIES = ["low", "medium", "high", "normal"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...TASK_CREATE_ROLES])
    }

    const type = requireOneOf(body.type, VALID_TASK_TYPES, "type")
    const status = body.status
      ? requireOneOf(body.status, VALID_TASK_STATUSES, "status")
      : "pending"
    const priority = body.priority
      ? requireOneOf(body.priority, VALID_PRIORITIES, "priority")
      : "normal"

    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      type,
      status,
      priority,
      assignee: body.assignee ?? "",
      assignee_id: body.assigneeId ?? null,
      order_id: body.orderId ?? null,
      location: body.location ?? "",
      items: typeof body.items === "number" ? body.items : 0,
      scheduled_date: body.scheduledDate ?? null,
      assigned_at: body.assigneeId ? new Date().toISOString() : null,
      estimated_packages: body.estimatedPackages ?? null,
      estimated_effort: body.estimatedEffort ?? null,
      zone: body.zone ?? null,
    }

    // Preserve client-supplied ID if provided (for idempotency in dev migration)
    if (body.id) payload.id = body.id

    const admin = createAdminClient()
    const { data, error } = await admin.from("tasks").insert(payload).select().single()

    if (error) {
      console.error("[api/tasks POST] DB error:", error)
      return NextResponse.json({ error: "Failed to create task." }, { status: 500 })
    }

    return NextResponse.json({ task: data }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/tasks POST] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
