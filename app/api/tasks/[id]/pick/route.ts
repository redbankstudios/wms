/**
 * POST /api/tasks/[id]/pick
 *
 * Confirm a pick for a task. Writes two ledger movements:
 *   1. unreserve — removes qty from reserved balance
 *   2. pick      — removes qty from on_hand balance
 *
 * Then updates the reservation record and optionally marks the task complete.
 *
 * Body shape:
 * {
 *   tenantId: string
 *   reservationId: string    // inventory_reservations.id
 *   pickedQty: number        // units physically removed from shelf
 *   note?: string
 * }
 *
 * If the task's associated order has ALL reservations fulfilled after this pick,
 * the order is automatically advanced to "picking" (if it isn't already past
 * that status). Actual order-level status management remains the responsibility
 * of the warehouse flow — this is a best-effort advance only.
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
  pickReservedInventory,
  getOrderReservationSummary,
} from "@/lib/inventory/fulfillmentService"

const PICK_ROLES = [
  "warehouse_manager",
  "warehouse_employee",
  "business_owner",
  "platform_owner",
] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...PICK_ROLES])
    }

    // Validate payload
    const reservationId = body.reservationId
    if (typeof reservationId !== "string" || !reservationId) {
      return NextResponse.json({ error: "reservationId is required." }, { status: 400 })
    }
    const pickedQty = body.pickedQty
    if (typeof pickedQty !== "number" || pickedQty <= 0) {
      return NextResponse.json({ error: "pickedQty must be a positive number." }, { status: 400 })
    }

    const admin = createAdminClient()

    // Validate task exists and belongs to tenant
    const { data: task, error: taskErr } = await admin
      .from("tasks")
      .select("id, tenant_id, status, order_id")
      .eq("id", taskId)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 })
    }
    if (!devMode && task.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }
    if (!["pending", "in_progress"].includes(task.status)) {
      return NextResponse.json(
        { error: `Task is in status '${task.status}' and cannot accept a pick confirmation.` },
        { status: 422 }
      )
    }

    // Confirm the pick through the fulfillment service
    const { unreserveMovementId, pickMovementId, newStatus } = await pickReservedInventory(
      admin,
      {
        tenantId,
        reservationId,
        pickedQty,
        actorId: appUser?.id ?? null,
        note: body.note,
      }
    )

    // Mark task as completed
    await admin
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", taskId)

    // Best-effort: if task has an order_id, check if all reservations fulfilled
    // and advance order to "picking" if still on "allocated"
    if (task.order_id) {
      try {
        const { data: orderRow } = await admin
          .from("orders")
          .select("id, status")
          .eq("id", task.order_id)
          .single()

        if (orderRow && orderRow.status === "allocated") {
          const summary = await getOrderReservationSummary(admin, tenantId, task.order_id)
          // Advance to "picking" if at least one reservation is partially or fully picked
          const hasAnyPick = summary.lines.some(l => l.pickedQty > 0)
          if (hasAnyPick) {
            await admin.from("orders").update({ status: "picking" }).eq("id", task.order_id)
          }
        }
      } catch {
        // Best-effort — do not fail the pick if order status update fails
      }
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "task.pick", taskId, {
      reservationId,
      pickedQty,
      unreserveMovementId,
      pickMovementId,
      newReservationStatus: newStatus,
    })

    return NextResponse.json({
      ok: true,
      taskId,
      reservationId,
      pickedQty,
      unreserveMovementId,
      pickMovementId,
      newReservationStatus: newStatus,
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/tasks pick] Unexpected error:", err)
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 })
  }
}
