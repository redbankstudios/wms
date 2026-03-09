/**
 * /api/inventory — Trusted inventory mutation endpoint
 *
 * Enforces:
 *   ✓ Authenticated user (Supabase session required in production)
 *   ✓ Tenant ownership verified against DB
 *   ✓ Role restriction (warehouse_manager, business_owner, platform_owner)
 *   ✓ Payload shape validation
 *   ✓ Write via service-role admin client (post-auth)
 *
 * Phase 2 addition: all quantity changes are now also recorded in
 * inventory_movements (immutable ledger) and inventory_balances (derived).
 * inventory_items.qty is kept in sync by the movement service for UI compat.
 *
 * Dev-mode bypass: if NODE_ENV=development and no session, auth/tenant/role
 * checks are skipped with a console warning. Payload validation always runs.
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
import { createInventoryMovement } from "@/lib/inventory/movementService"

const INVENTORY_WRITE_ROLES = ["warehouse_manager", "business_owner", "platform_owner"] as const
const VALID_STATUSES = ["in_stock", "low_stock", "out_of_stock", "quarantined"] as const

// ─── POST /api/inventory — Create inventory item ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...INVENTORY_WRITE_ROLES])
    }

    const sku = requireString(body.sku, "sku")
    const name = requireString(body.name, "name")
    const location = requireString(body.location, "location")
    const client = requireString(body.client, "client")
    const status = requireOneOf(body.status, VALID_STATUSES, "status")

    if (typeof body.qty !== "number" || body.qty < 0) {
      throw new AuthError(400, "Field 'qty' must be a non-negative number.")
    }
    if (typeof body.minStock !== "number" || body.minStock < 0) {
      throw new AuthError(400, "Field 'minStock' must be a non-negative number.")
    }

    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      sku,
      name,
      location,
      client,
      status,
      qty: body.qty,
      min_stock: body.minStock,
    }
    if (typeof body.productUnits === "number") {
      payload.product_units = body.productUnits
    }
    // Use caller-provided ID for idempotency, or generate one
    payload.id = body.id || `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("inventory_items")
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error("[api/inventory POST] DB error:", error)
      return NextResponse.json({ error: "Failed to create inventory item." }, { status: 500 })
    }

    // Record opening movement in ledger (adjust_increase for initial qty)
    if (body.qty > 0) {
      await createInventoryMovement(admin, {
        tenantId,
        inventoryItemId: data.id,
        movementType: "adjust_increase",
        qty: body.qty,
        toLocation: location,
        referenceType: "manual",
        actorId: appUser?.id ?? null,
        note: "Initial stock entry",
      }).catch((err) => {
        console.error("[api/inventory POST] Ledger write failed:", err)
        // Do not fail the request — item is created, balance row will be seeded on next rebuild
      })
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "inventory.create", data.id, { sku: data.sku })
    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inventory POST] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── PATCH /api/inventory — Update inventory item ────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = requireString(body.id, "id")
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...INVENTORY_WRITE_ROLES])
    }

    const admin = createAdminClient()

    // Fetch existing item for tenant check and qty delta computation
    const { data: existing } = await admin
      .from("inventory_items")
      .select("tenant_id, qty, location")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found." }, { status: 404 })
    }
    if (!devMode && existing.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (body.sku !== undefined) updates.sku = requireString(body.sku, "sku")
    if (body.name !== undefined) updates.name = requireString(body.name, "name")
    if (body.location !== undefined) updates.location = requireString(body.location, "location")
    if (body.client !== undefined) updates.client = requireString(body.client, "client")
    if (body.status !== undefined) updates.status = requireOneOf(body.status, VALID_STATUSES, "status")
    if (body.qty !== undefined) {
      if (typeof body.qty !== "number" || body.qty < 0)
        throw new AuthError(400, "Field 'qty' must be a non-negative number.")
      updates.qty = body.qty
    }
    if (body.minStock !== undefined) {
      if (typeof body.minStock !== "number" || body.minStock < 0)
        throw new AuthError(400, "Field 'minStock' must be a non-negative number.")
      updates.min_stock = body.minStock
    }
    if (body.productUnits !== undefined) {
      if (typeof body.productUnits !== "number" || body.productUnits < 0)
        throw new AuthError(400, "Field 'productUnits' must be a non-negative number.")
      updates.product_units = body.productUnits
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
    }

    // If qty is changing, record a ledger movement BEFORE applying the update
    if (body.qty !== undefined && body.qty !== existing.qty) {
      const oldQty: number = existing.qty ?? 0
      const newQty: number = body.qty
      const delta = Math.abs(newQty - oldQty)

      await createInventoryMovement(admin, {
        tenantId,
        inventoryItemId: id,
        movementType: newQty > oldQty ? "adjust_increase" : "adjust_decrease",
        qty: delta,
        fromLocation: existing.location ?? undefined,
        toLocation: (body.location as string | undefined) ?? existing.location ?? undefined,
        referenceType: "manual",
        actorId: appUser?.id ?? null,
        note: `Manual adjustment: ${oldQty} → ${newQty}`,
      }).catch((err) => {
        console.error("[api/inventory PATCH] Ledger write failed:", err)
      })

      // Ledger service already updates inventory_items.qty — skip duplicate write
      delete updates.qty
    }

    // If location changed but qty didn't, record a transfer movement
    if (
      body.location !== undefined &&
      body.location !== existing.location &&
      body.qty === undefined
    ) {
      await createInventoryMovement(admin, {
        tenantId,
        inventoryItemId: id,
        movementType: "transfer",
        qty: existing.qty ?? 0,
        fromLocation: existing.location ?? undefined,
        toLocation: body.location as string,
        referenceType: "manual",
        actorId: appUser?.id ?? null,
        note: "Location transfer",
      }).catch((err) => {
        console.error("[api/inventory PATCH] Transfer ledger write failed:", err)
      })
    }

    // Apply remaining non-qty field updates (or full update if no qty change)
    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await admin
        .from("inventory_items")
        .update(updates)
        .eq("id", id)

      if (updateErr) {
        console.error("[api/inventory PATCH] DB error:", updateErr)
        return NextResponse.json({ error: "Failed to update inventory item." }, { status: 500 })
      }
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "inventory.update", id, {
      fields: Object.keys({ ...updates, ...(body.qty !== undefined ? { qty: body.qty } : {}) }),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inventory PATCH] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── DELETE /api/inventory — Delete inventory item ───────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const id = requireString(body.id, "id")
    const tenantId = requireString(body.tenantId, "tenantId")

    const { appUser, devMode } = await resolveAuth(tenantId)
    if (!devMode) {
      requireTenantAccess(appUser!, tenantId)
      requireRole(appUser!, [...INVENTORY_WRITE_ROLES])
    }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from("inventory_items")
      .select("tenant_id, qty, location")
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Inventory item not found." }, { status: 404 })
    }
    if (!devMode && existing.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Tenant mismatch." }, { status: 403 })
    }

    // Record the final write-off movement before deleting
    if ((existing.qty ?? 0) > 0) {
      await createInventoryMovement(admin, {
        tenantId,
        inventoryItemId: id,
        movementType: "adjust_decrease",
        qty: existing.qty,
        fromLocation: existing.location ?? undefined,
        referenceType: "manual",
        actorId: appUser?.id ?? null,
        note: "Item deleted — final write-off",
      }).catch((err) => {
        console.error("[api/inventory DELETE] Ledger write failed:", err)
      })
    }

    const { error: deleteErr } = await admin.from("inventory_items").delete().eq("id", id)

    if (deleteErr) {
      console.error("[api/inventory DELETE] DB error:", deleteErr)
      return NextResponse.json({ error: "Failed to delete inventory item." }, { status: 500 })
    }

    await logAuditEvent(admin, tenantId, appUser?.id ?? null, "inventory.delete", id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse()
    console.error("[api/inventory DELETE] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
