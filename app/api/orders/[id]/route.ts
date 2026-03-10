/**
 * /api/orders/[id] — Trusted order mutation endpoint
 *
 * Enforces: auth → tenant → role-per-transition → valid transition → admin write.
 * Dev-mode bypass active when NODE_ENV=development and no session.
 */
import { NextRequest, NextResponse } from "next/server"
import {
  AuthError,
  resolveAuth,
  requireTenantAccess,
  requireString,
  requireOneOf,
  logAuditEvent,
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"
import type { AppUser } from "@/lib/authz"

const VALID_ORDER_STATUSES = [
  "pending", "allocated", "picking", "processing", "packed", "shipped", "in_transit",
  "delivered", "cancelled", "returned",
] as const

type OrderStatus = typeof VALID_ORDER_STATUSES[number]

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Fulfillment-ledger states (Phase 6)
  pending:    ["allocated", "processing", "cancelled"],
  allocated:  ["picking", "pending", "cancelled"],   // "pending" = release
  picking:    ["packed", "cancelled"],
  // Legacy / downstream states
  processing: ["packed", "cancelled"],
  packed:     ["shipped", "cancelled"],
  shipped:    ["in_transit", "cancelled"],
  in_transit: ["delivered", "returned"],
  delivered:  ["returned"],
  cancelled:  [],
  returned:   [],
}

function allowedRolesForTransition(to: OrderStatus): string[] {
  switch (to) {
    case "allocated":
    case "picking":
    case "processing":
    case "packed":
      return ["warehouse_manager", "warehouse_employee", "packer", "business_owner", "platform_owner"]
    case "shipped":
    case "in_transit":
      return ["shipping_manager", "driver_dispatcher", "business_owner", "platform_owner"]
    case "delivered":
      return ["driver", "driver_dispatcher", "shipping_manager", "business_owner", "platform_owner"]
    case "cancelled":
      return ["warehouse_manager", "shipping_manager", "business_owner", "platform_owner"]
    case "returned":
      return ["driver", "warehouse_manager", "shipping_manager", "business_owner", "platform_owner"]
    default:
      return ["business_owner", "platform_owner"]
  }
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
    if (!devMode) requireTenantAccess(appUser!, tenantId)

    const admin = createAdminClient()

    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, tenant_id, status")
      .eq("id", id)
      .single()

    if (fetchErr || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
    if (!devMode && order.tenant_id !== tenantId) return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })

    const updates: Record<string, unknown> = {}

    if (body.status !== undefined) {
      const newStatus = requireOneOf(body.status, VALID_ORDER_STATUSES, "status")
      const currentStatus = order.status as OrderStatus
      const allowedNext = VALID_TRANSITIONS[currentStatus] ?? []

      if (!allowedNext.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid order status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowedNext.join(", ")}].` },
          { status: 422 }
        )
      }

      // Role check per transition (skipped in dev mode)
      if (!devMode) {
        const allowedRoles = allowedRolesForTransition(newStatus)
        const user = appUser as AppUser
        if (user.role !== "platform_owner" && !allowedRoles.includes(user.role)) {
          throw new AuthError(403, `Your role ('${user.role}') cannot move orders to '${newStatus}'.`)
        }
      }

      updates.status = newStatus
    }

    if (body.deliveryLat !== undefined && typeof body.deliveryLat === "number") {
      updates.delivery_lat = body.deliveryLat
    }
    if (body.deliveryLng !== undefined && typeof body.deliveryLng === "number") {
      updates.delivery_lng = body.deliveryLng
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
    }

    const { error: updateErr } = await admin.from("orders").update(updates).eq("id", id)
    if (updateErr) {
      console.error("[api/orders PATCH] DB error:", updateErr)
      return NextResponse.json({ error: "Failed to update order." }, { status: 500 })
    }
    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "order.update", id, { updates })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders PATCH] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
