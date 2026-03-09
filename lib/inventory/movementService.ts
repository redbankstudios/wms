/**
 * Inventory Movement Service — Phase 2 Ledger Foundation
 *
 * SERVER-SIDE ONLY. All functions require a Supabase admin client.
 * Never import this module from browser/client components.
 *
 * Design:
 *   - inventory_movements is immutable (append-only). One row per event.
 *   - inventory_balances is derived state kept in sync on every write.
 *   - inventory_items.qty is mirrored from inventory_balances.on_hand so
 *     all existing UI reads continue to work without modification.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { resolveBarcodeQty } from "./barcodeService"

// ── Movement types ────────────────────────────────────────────────────────────

export type MovementType =
  | "receive"          // inbound receipt — increases on_hand
  | "putaway"          // staging → storage — location-only, no balance change
  | "transfer"         // internal location transfer — location-only, no balance change
  | "reserve"          // allocate for an order — increases reserved
  | "unreserve"        // release reservation — decreases reserved
  | "pick"             // remove from storage for fulfillment — decreases on_hand
  | "pack"             // associate with pack task — no balance change
  | "ship"             // leaves warehouse — decreases on_hand (if not already picked)
  | "return_restock"   // returned item back to stock — increases on_hand
  | "return_scrap"     // returned item disposed/scrapped — decreases on_hand
  | "adjust_increase"  // manual positive adjustment
  | "adjust_decrease"  // manual negative adjustment

// Types that increase on_hand
const ON_HAND_INCREASE: ReadonlySet<MovementType> = new Set([
  "receive",
  "return_restock",
  "adjust_increase",
])

// Types that decrease on_hand
const ON_HAND_DECREASE: ReadonlySet<MovementType> = new Set([
  "pick",
  "ship",
  "return_scrap",
  "adjust_decrease",
])

// Types that increase reserved (reserved is a subset of on_hand)
const RESERVED_INCREASE: ReadonlySet<MovementType> = new Set(["reserve"])

// Types that decrease reserved
const RESERVED_DECREASE: ReadonlySet<MovementType> = new Set(["unreserve"])

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CreateMovementParams {
  tenantId: string
  inventoryItemId: string
  movementType: MovementType
  /**
   * Base-unit quantity. Required unless barcode + scannedQty is provided.
   * When barcode is supplied, qty is derived automatically from the scan resolution.
   */
  qty?: number
  /**
   * Optional barcode scan path (Phase 3+).
   * If provided, scannedQty × quantityMultiplier replaces qty.
   * inventoryItemId must still be supplied (resolved from barcode by caller or barcodeService).
   */
  barcode?: string
  /** How many units of the barcode were scanned. Defaults to 1. */
  scannedQty?: number
  /** UOM hint — informational, stored in note if barcode resolution is used. */
  uom?: string
  fromLocation?: string
  toLocation?: string
  referenceId?: string
  referenceType?: string
  actorId?: string | null
  note?: string
}

export interface InventoryBalance {
  on_hand: number
  reserved: number
  available: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateMovementId(): string {
  return `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get current inventory balance for a single item.
 * Returns null if no balance row exists yet (item predates ledger).
 */
export async function getInventoryBalance(
  db: SupabaseClient,
  tenantId: string,
  inventoryItemId: string
): Promise<InventoryBalance | null> {
  const { data, error } = await db
    .from("inventory_balances")
    .select("on_hand, reserved, available")
    .eq("tenant_id", tenantId)
    .eq("inventory_item_id", inventoryItemId)
    .single()

  if (error || !data) return null
  return data as InventoryBalance
}

/**
 * Resolve the effective base-unit qty from params.
 * If barcode is supplied: scannedQty × quantityMultiplier from barcode resolution.
 * Otherwise: params.qty directly.
 * Returns null if neither source provides a value.
 */
async function _resolveQty(
  db: SupabaseClient,
  params: CreateMovementParams
): Promise<number | null> {
  if (params.barcode) {
    const result = await resolveBarcodeQty(
      db,
      params.barcode,
      params.tenantId,
      params.scannedQty ?? 1
    )
    return result?.baseQty ?? null
  }
  return params.qty ?? null
}

/**
 * Validate a movement before writing it.
 * Returns an error string if invalid, null if the movement is safe to apply.
 */
export async function validateInventoryMovement(
  db: SupabaseClient,
  params: CreateMovementParams
): Promise<string | null> {
  const { tenantId, inventoryItemId, movementType } = params
  const resolvedQty = await _resolveQty(db, params)
  if (resolvedQty === null) return "qty must be provided (or barcode + scannedQty)"
  if (resolvedQty <= 0) return "qty must be a positive number"

  if (ON_HAND_DECREASE.has(movementType)) {
    const balance = await getInventoryBalance(db, tenantId, inventoryItemId)
    if (balance !== null && balance.on_hand < resolvedQty) {
      return `Insufficient on_hand (${balance.on_hand}) for ${movementType} of ${resolvedQty}`
    }
  }

  if (RESERVED_DECREASE.has(movementType)) {
    const balance = await getInventoryBalance(db, tenantId, inventoryItemId)
    if (balance !== null && balance.reserved < resolvedQty) {
      return `Insufficient reserved (${balance.reserved}) to unreserve ${resolvedQty}`
    }
  }

  return null
}

/**
 * Create an inventory movement and update derived balances atomically.
 *
 * This is the ONLY write path for inventory quantity changes. All callers
 * (API routes, return disposition, transfer) must go through this function.
 *
 * Throws on DB error. Does not catch — let the API route handle errors.
 */
export async function createInventoryMovement(
  db: SupabaseClient,
  params: CreateMovementParams
): Promise<{ movementId: string; resolvedQty: number }> {
  const { tenantId, inventoryItemId, movementType } = params

  // Resolve effective qty — from barcode scan or direct qty field
  const qty = await _resolveQty(db, params)
  if (qty === null || qty <= 0) {
    throw new Error("[movementService] qty must be a positive number (or provide barcode + scannedQty)")
  }

  // Build note: append barcode info when scan path was used
  const note = params.barcode
    ? `${params.note ? params.note + " | " : ""}barcode:${params.barcode} scanned:${params.scannedQty ?? 1} → ${qty} base units`
    : (params.note ?? null)

  // Compute signed delta for the movement record
  let signedDelta = 0
  let onHandDelta = 0
  let reservedDelta = 0

  if (ON_HAND_INCREASE.has(movementType)) {
    signedDelta = qty
    onHandDelta = qty
  } else if (ON_HAND_DECREASE.has(movementType)) {
    signedDelta = -qty
    onHandDelta = -qty
  } else if (RESERVED_INCREASE.has(movementType)) {
    signedDelta = qty
    reservedDelta = qty
  } else if (RESERVED_DECREASE.has(movementType)) {
    signedDelta = -qty
    reservedDelta = -qty
  }
  // putaway, transfer, pack: signedDelta stays 0 — location-only

  const movementId = generateMovementId()

  // 1. Insert immutable movement record
  const { error: insertErr } = await db.from("inventory_movements").insert({
    id: movementId,
    tenant_id: tenantId,
    inventory_item_id: inventoryItemId,
    movement_type: movementType,
    qty_delta: signedDelta,
    from_location: params.fromLocation ?? null,
    to_location: params.toLocation ?? null,
    reference_id: params.referenceId ?? null,
    reference_type: params.referenceType ?? null,
    actor_id: params.actorId ?? null,
    note,
    created_at: new Date().toISOString(),
  })

  if (insertErr) {
    throw new Error(`[movementService] Failed to insert movement: ${insertErr.message}`)
  }

  // 2. Update derived balances (skip for pure location moves)
  if (onHandDelta !== 0 || reservedDelta !== 0) {
    await _applyBalanceDelta(db, tenantId, inventoryItemId, onHandDelta, reservedDelta)
  }

  return { movementId, resolvedQty: qty }
}

/**
 * Rebuild inventory_balances for a single item by replaying all movements.
 * Use this for backfill or data repair — not for normal operation.
 * Also syncs inventory_items.qty to the rebuilt on_hand value.
 */
export async function rebuildInventoryBalanceForItem(
  db: SupabaseClient,
  tenantId: string,
  inventoryItemId: string
): Promise<void> {
  const { data: movements } = await db
    .from("inventory_movements")
    .select("movement_type, qty_delta")
    .eq("tenant_id", tenantId)
    .eq("inventory_item_id", inventoryItemId)
    .order("created_at", { ascending: true })

  let onHand = 0
  let reserved = 0

  for (const m of movements ?? []) {
    const type = m.movement_type as MovementType
    if (ON_HAND_INCREASE.has(type) || ON_HAND_DECREASE.has(type)) {
      onHand += m.qty_delta // stored as signed
    } else if (RESERVED_INCREASE.has(type) || RESERVED_DECREASE.has(type)) {
      reserved += m.qty_delta // stored as signed
    }
  }

  const safeOnHand = Math.max(0, onHand)
  const safeReserved = Math.max(0, reserved)

  await db.from("inventory_balances").upsert(
    {
      tenant_id: tenantId,
      inventory_item_id: inventoryItemId,
      on_hand: safeOnHand,
      reserved: safeReserved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,inventory_item_id" }
  )

  // Mirror to inventory_items.qty for UI compatibility
  await db
    .from("inventory_items")
    .update({ qty: safeOnHand })
    .eq("id", inventoryItemId)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _applyBalanceDelta(
  db: SupabaseClient,
  tenantId: string,
  inventoryItemId: string,
  onHandDelta: number,
  reservedDelta: number
): Promise<void> {
  const { data: existing } = await db
    .from("inventory_balances")
    .select("on_hand, reserved")
    .eq("tenant_id", tenantId)
    .eq("inventory_item_id", inventoryItemId)
    .single()

  const currentOnHand = existing?.on_hand ?? 0
  const currentReserved = existing?.reserved ?? 0

  const newOnHand = Math.max(0, currentOnHand + onHandDelta)
  const newReserved = Math.max(0, currentReserved + reservedDelta)

  if (existing) {
    await db
      .from("inventory_balances")
      .update({ on_hand: newOnHand, reserved: newReserved, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("inventory_item_id", inventoryItemId)
  } else {
    await db.from("inventory_balances").insert({
      tenant_id: tenantId,
      inventory_item_id: inventoryItemId,
      on_hand: Math.max(0, onHandDelta),
      reserved: Math.max(0, reservedDelta),
      updated_at: new Date().toISOString(),
    })
  }

  // Mirror on_hand → inventory_items.qty for backward compatibility
  if (onHandDelta !== 0) {
    await db
      .from("inventory_items")
      .update({ qty: newOnHand })
      .eq("id", inventoryItemId)
  }
}
