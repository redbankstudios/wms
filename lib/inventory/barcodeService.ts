/**
 * Barcode Resolution Service — Phase 3 Barcode & UOM Foundation
 *
 * SERVER-SIDE ONLY. All functions require a Supabase admin client.
 * Never import this module from browser/client components.
 *
 * Responsibilities:
 *   - Resolve a barcode string to { productId, sku, inventoryItemId, uom, quantityMultiplier }
 *   - Convert quantities between UOMs using product_uom_conversions
 *   - Provide base-unit qty for a given scan count (barcode + qty → base units)
 *
 * Does NOT perform writes. All ledger writes go through movementService.ts.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// ── Result types ──────────────────────────────────────────────────────────────

export interface BarcodeResolution {
  /** The product's ID in public.products */
  productId: string
  /** The product's SKU (used to match inventory_items) */
  sku: string
  /** The inventory_items.id for this SKU in this tenant, or null if not yet stocked */
  inventoryItemId: string | null
  /** The unit of measure this barcode represents (e.g. "case", "each") */
  uom: string
  /**
   * How many base units one scan of this barcode represents.
   * Derived from product_barcodes.quantity_per_unit.
   * e.g. case barcode → quantityMultiplier = 24
   */
  quantityMultiplier: number
  /** The scanned barcode string */
  barcode: string
  /** EAN13 | UPC | CODE128 | etc. */
  barcodeType: string
  /** Whether this is the primary barcode for this product */
  isPrimary: boolean
}

export interface UomConversionResult {
  fromUom: string
  toUom: string
  /** Rounded to whole base units */
  convertedQty: number
  conversionFactor: number
  /** True if a stored conversion was found; false means 1:1 fallback was used */
  resolved: boolean
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Resolve a barcode string to product + UOM metadata.
 *
 * Returns null if:
 *   - No barcode record matches (unknown barcode)
 *   - The barcode's product_id has no matching row in public.products
 *
 * The inventoryItemId field is null when the product exists but has not yet
 * been received into the warehouse (no inventory_items row for this SKU).
 */
export async function resolveBarcode(
  db: SupabaseClient,
  barcode: string,
  tenantId: string
): Promise<BarcodeResolution | null> {
  const { data: barcodeRow, error } = await db
    .from("product_barcodes")
    .select("id, product_id, barcode, barcode_type, uom_code, quantity_per_unit, is_primary")
    .eq("tenant_id", tenantId)
    .eq("barcode", barcode)
    .single()

  if (error || !barcodeRow) return null

  // Resolve product SKU
  const { data: product } = await db
    .from("products")
    .select("id, sku")
    .eq("tenant_id", tenantId)
    .eq("id", barcodeRow.product_id)
    .single()

  if (!product) return null

  // Resolve inventory_item (may not exist for products not yet in stock)
  const { data: invItem } = await db
    .from("inventory_items")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("sku", product.sku)
    .maybeSingle()

  return {
    productId: barcodeRow.product_id,
    sku: product.sku,
    inventoryItemId: invItem?.id ?? null,
    uom: barcodeRow.uom_code,
    quantityMultiplier: barcodeRow.quantity_per_unit,
    barcode: barcodeRow.barcode,
    barcodeType: barcodeRow.barcode_type,
    isPrimary: barcodeRow.is_primary,
  }
}

/**
 * Resolve a barcode + scanned count to a base-unit quantity.
 *
 * This is the primary entry point for scan-based receiving, picking, and transfers.
 *
 * Example:
 *   barcode = "012345678918" (case, quantityMultiplier = 24)
 *   scannedQty = 3 cases
 *   → baseQty = 72 (eaches, written to ledger)
 */
export async function resolveBarcodeQty(
  db: SupabaseClient,
  barcode: string,
  tenantId: string,
  scannedQty: number = 1
): Promise<{ resolution: BarcodeResolution; baseQty: number } | null> {
  if (scannedQty <= 0) return null

  const resolution = await resolveBarcode(db, barcode, tenantId)
  if (!resolution) return null

  const baseQty = scannedQty * resolution.quantityMultiplier
  return { resolution, baseQty }
}

/**
 * Convert a quantity from one UOM to another for a specific product.
 *
 * Lookup order:
 *   1. Direct conversion in product_uom_conversions (from_uom → to_uom)
 *   2. Inverse conversion (to_uom → from_uom, then invert the factor)
 *   3. quantity_per_unit from product_barcodes for this UOM
 *   4. 1:1 passthrough with a console warning (graceful degradation)
 *
 * Quantities are rounded to whole base units (inventory is tracked in integers).
 */
export async function convertToBaseUnits(
  db: SupabaseClient,
  tenantId: string,
  productId: string,
  qty: number,
  fromUom: string,
  toUom: string = "each"
): Promise<UomConversionResult> {
  if (fromUom === toUom) {
    return { fromUom, toUom, convertedQty: qty, conversionFactor: 1, resolved: true }
  }

  // 1. Direct conversion
  const { data: direct } = await db
    .from("product_uom_conversions")
    .select("conversion_factor")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("from_uom", fromUom)
    .eq("to_uom", toUom)
    .maybeSingle()

  if (direct) {
    const factor = Number(direct.conversion_factor)
    return {
      fromUom,
      toUom,
      convertedQty: Math.round(qty * factor),
      conversionFactor: factor,
      resolved: true,
    }
  }

  // 2. Inverse conversion
  const { data: inverse } = await db
    .from("product_uom_conversions")
    .select("conversion_factor")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("from_uom", toUom)
    .eq("to_uom", fromUom)
    .maybeSingle()

  if (inverse) {
    const factor = 1 / Number(inverse.conversion_factor)
    return {
      fromUom,
      toUom,
      convertedQty: Math.round(qty * factor),
      conversionFactor: factor,
      resolved: true,
    }
  }

  // 3. Fall back to barcode quantity_per_unit
  const { data: barcodeRow } = await db
    .from("product_barcodes")
    .select("quantity_per_unit")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("uom_code", fromUom)
    .limit(1)
    .maybeSingle()

  if (barcodeRow) {
    const factor = barcodeRow.quantity_per_unit
    return {
      fromUom,
      toUom,
      convertedQty: Math.round(qty * factor),
      conversionFactor: factor,
      resolved: true,
    }
  }

  // 4. No conversion available — pass through, log warning
  console.warn(
    `[barcodeService] No UOM conversion found: ${fromUom}→${toUom} for product ${productId} (tenant ${tenantId}). Using 1:1.`
  )
  return { fromUom, toUom, convertedQty: qty, conversionFactor: 1, resolved: false }
}

/**
 * Get all barcodes registered for a product, ordered primary-first.
 */
export async function getBarcodesForProduct(
  db: SupabaseClient,
  tenantId: string,
  productId: string
): Promise<
  Array<{
    barcode: string
    barcodeType: string
    uom: string
    quantityPerUnit: number
    isPrimary: boolean
  }>
> {
  const { data } = await db
    .from("product_barcodes")
    .select("barcode, barcode_type, uom_code, quantity_per_unit, is_primary")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })

  return (data ?? []).map((row) => ({
    barcode: row.barcode,
    barcodeType: row.barcode_type,
    uom: row.uom_code,
    quantityPerUnit: row.quantity_per_unit,
    isPrimary: row.is_primary,
  }))
}

/**
 * Get all UOM conversions defined for a product.
 */
export async function getConversionsForProduct(
  db: SupabaseClient,
  tenantId: string,
  productId: string
): Promise<Array<{ fromUom: string; toUom: string; conversionFactor: number }>> {
  const { data } = await db
    .from("product_uom_conversions")
    .select("from_uom, to_uom, conversion_factor")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)

  return (data ?? []).map((row) => ({
    fromUom: row.from_uom,
    toUom: row.to_uom,
    conversionFactor: Number(row.conversion_factor),
  }))
}

/**
 * Look up the primary barcode for a product (most common lookup for label printing).
 */
export async function getPrimaryBarcode(
  db: SupabaseClient,
  tenantId: string,
  productId: string
): Promise<string | null> {
  const { data } = await db
    .from("product_barcodes")
    .select("barcode")
    .eq("tenant_id", tenantId)
    .eq("product_id", productId)
    .eq("is_primary", true)
    .maybeSingle()

  return data?.barcode ?? null
}
