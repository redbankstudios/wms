/**
 * POST /api/orders/[id]/allocate
 *
 * Reserve inventory for an order. For each line supplied, checks available
 * balance and writes a `reserve` movement through the ledger.
 *
 * On success, advances the order status to "allocated".
 * If any line cannot be fully reserved (insufficient stock), the request
 * succeeds but the response body lists the under-allocated lines. The order
 * is still moved to "allocated" if at least one line was reserved — the UI
 * can surface the partial-allocation warning.
 *
 * Body shape:
 * {
 *   tenantId: string
 *   lines: [
 *     {
 *       inventoryItemId: string   // inventory_items.id
 *       sku: string
 *       qty: number               // base units to reserve
 *       orderLineId?: string      // optional: set when order_lines row exists
 *     }
 *   ]
 * }
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
import { reserveInventoryForOrder, releaseReservation } from "@/lib/inventory/fulfillmentService"

const ALLOCATE_ROLES = [
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
    const { id: orderId } = await params
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ALLOCATE_ROLES])
    }

    // Validate lines payload
    const lines = body.lines
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "lines must be a non-empty array." }, { status: 400 })
    }

    for (const line of lines) {
      if (typeof line.inventoryItemId !== "string" || !line.inventoryItemId) {
        return NextResponse.json({ error: "Each line must have inventoryItemId." }, { status: 400 })
      }
      if (typeof line.sku !== "string" || !line.sku) {
        return NextResponse.json({ error: "Each line must have sku." }, { status: 400 })
      }
      if (typeof line.qty !== "number" || line.qty <= 0) {
        return NextResponse.json({ error: "Each line qty must be a positive number." }, { status: 400 })
      }
    }

    const admin = createAdminClient()

    // Fetch order and validate tenant + current status
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, tenant_id, status")
      .eq("id", orderId)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
    if (!devMode && order.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }
    if (!["pending"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot allocate order in status '${order.status}'. Order must be pending.` },
        { status: 422 }
      )
    }

    // Attempt reservation for each line
    const { reserved, insufficient } = await reserveInventoryForOrder(admin, {
      tenantId,
      orderId,
      lines: lines.map((l: any) => ({
        inventoryItemId: l.inventoryItemId,
        sku: l.sku,
        qty: l.qty,
        orderLineId: l.orderLineId,
      })),
      actorId: appUser?.id ?? null,
    })

    // If nothing could be reserved at all, release partials and fail
    if (reserved.length === 0) {
      // No partials to release (nothing was created)
      return NextResponse.json(
        {
          error: "Insufficient stock for all lines. No inventory was reserved.",
          insufficient,
        },
        { status: 422 }
      )
    }

    // Advance order to "allocated"
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "allocated" })
      .eq("id", orderId)

    if (updateErr) {
      // Roll back reservations
      await releaseReservation(admin, { tenantId, orderId, actorId: appUser?.id ?? null })
      return NextResponse.json({ error: "Failed to update order status." }, { status: 500 })
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "order.allocate", orderId, {
      reserved: reserved.length,
      insufficient: insufficient.length,
      lines: reserved.map(r => ({ sku: r.sku, qty: r.qty })),
    })

    return NextResponse.json({
      ok: true,
      orderId,
      reserved,
      insufficient,
      partialAllocation: insufficient.length > 0,
    })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders allocate] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
