/**
 * POST /api/orders — Trusted order creation endpoint
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
} from "@/lib/authz"
import { createAdminClient } from "@/lib/supabase/server"

const ORDER_CREATE_ROLES = [
  "warehouse_manager",
  "shipping_manager",
  "business_owner",
  "platform_owner",
] as const

const VALID_STATUSES = [
  "pending", "processing", "packed", "shipped", "in_transit",
  "delivered", "cancelled", "returned",
] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...ORDER_CREATE_ROLES])
    }

    const status = body.status
      ? requireOneOf(body.status, VALID_STATUSES, "status")
      : "pending"

    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      customer: requireString(body.client ?? body.customer, "client"),
      status,
      destination: body.destination ?? "",
      items: body.items ?? 0,
    }
    if (body.deliveryLat !== undefined && typeof body.deliveryLat === "number") {
      payload.delivery_lat = body.deliveryLat
    }
    if (body.deliveryLng !== undefined && typeof body.deliveryLng === "number") {
      payload.delivery_lng = body.deliveryLng
    }
    if (body.id) payload.id = body.id

    const admin = createAdminClient()
    const { data, error } = await admin.from("orders").insert(payload).select().single()

    if (error) {
      console.error("[api/orders POST] DB error:", error)
      return NextResponse.json({ error: "Failed to create order." }, { status: 500 })
    }

    return NextResponse.json({ order: data }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/orders POST] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
