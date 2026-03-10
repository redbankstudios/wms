/**
 * POST /api/tasks/[id]/putaway
 *
 * Confirm a putaway task. Moves inventory from staging/dock to the
 * final storage location.
 *
 * Body shape:
 * {
 *   tenantId:             string
 *   destinationLocation:  string   // final rack/bin code, e.g. "R-01-A-1-1"
 *   note?:                string
 * }
 *
 * What happens:
 *   1. Task is validated (type=Putaway, status≠completed)
 *   2. A 'putaway' ledger movement is written:
 *        from_location = source (staging code)
 *        to_location   = destinationLocation
 *        qty_delta     = 0 (location-only — on_hand unchanged)
 *   3. inventory_items.location is updated to destinationLocation
 *   4. Task status → completed, completed_at and completed_by_user_id set
 *   5. Audit event logged
 *
 * Idempotency: returns 422 if the task is already completed.
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
import { confirmPutawayTask } from "@/lib/inventory/putawayService"

const PUTAWAY_ROLES = [
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
      requireRole(appUser!, [...PUTAWAY_ROLES])
    }

    // Validate destinationLocation
    const destinationLocation = body.destinationLocation
    if (typeof destinationLocation !== "string" || destinationLocation.trim() === "") {
      return NextResponse.json(
        { error: "destinationLocation is required and must be a non-empty string." },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    let movementId: string
    try {
      const result = await confirmPutawayTask(
        admin,
        tenantId,
        taskId,
        destinationLocation,
        appUser?.id ?? null
      )
      movementId = result.movementId
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Re-classify known domain errors as 422
      if (
        msg.includes("already completed") ||
        msg.includes("not a Putaway task") ||
        msg.includes("not found") ||
        msg.includes("no inventory_item_id")
      ) {
        return NextResponse.json({ error: msg }, { status: 422 })
      }
      throw err
    }

    await logAuditEvent(
      admin,
      tenantId,
      appUser?.id ?? null,
      "task.putaway.confirm",
      taskId,
      { destinationLocation, movementId, note: body.note }
    )

    return NextResponse.json({
      ok: true,
      taskId,
      destinationLocation,
      movementId,
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/tasks/putaway POST]", err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    )
  }
}
