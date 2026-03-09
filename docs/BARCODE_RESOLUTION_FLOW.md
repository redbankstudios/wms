# Barcode Resolution Flow

**Phase:** 3
**Status:** IMPLEMENTED (service layer complete, scan UI deferred to Phase 4)

---

## Overview

Barcode resolution is the process of turning a raw scanned barcode string into a structured
`{ productId, sku, inventoryItemId, uom, quantityMultiplier }` result, ready for ledger writes.

---

## Resolution Steps

```
Scan event
    │
    ▼
resolveBarcode(db, barcode, tenantId)           [barcodeService.ts]
    │
    ├── Query product_barcodes WHERE tenant_id = ? AND barcode = ?
    │       → barcode row (product_id, uom_code, quantity_per_unit, is_primary)
    │
    ├── Query products WHERE id = product_id
    │       → product row (sku)
    │
    └── Query inventory_items WHERE sku = ? (maybeSingle)
            → inventoryItemId (or null if not yet in stock)
    │
    ▼
BarcodeResolution {
  productId, sku, inventoryItemId,
  uom, quantityMultiplier, barcode, barcodeType, isPrimary
}
```

---

## Scan → Ledger Path

```
Scan barcode "012345678918" (case, qty_per_unit = 24)
Operator enters scannedQty = 3

    │
    ▼
resolveBarcodeQty(db, barcode, tenantId, scannedQty=3)
    │
    ├── resolveBarcode() → { uom: "case", quantityMultiplier: 24 }
    │
    └── baseQty = 3 × 24 = 72
    │
    ▼
createInventoryMovement(db, {
  tenantId,
  inventoryItemId,
  movementType: "receive",
  barcode: "012345678918",   ← optional scan path
  scannedQty: 3,
})
    │
    ├── _resolveQty() → calls resolveBarcodeQty → 72
    │
    ├── Note auto-appended: "barcode:012345678918 scanned:3 → 72 base units"
    │
    └── Ledger write: qty_delta = +72
```

---

## Fallback Hierarchy

When `resolveBarcode` or the scan path is not used, the service falls back gracefully:

| Situation | Behaviour |
|-----------|-----------|
| Barcode found, direct UOM conversion exists | Uses `conversion_factor` from `product_uom_conversions` |
| Barcode found, inverse conversion exists | Inverts the factor |
| No stored conversion, barcode has `quantity_per_unit` | Uses `quantity_per_unit` directly |
| No conversion data at all | 1:1 passthrough + console.warn |
| `qty` provided directly (no barcode) | Used as-is (existing Phase 2 path) |

---

## Error Cases

| Error | Result |
|-------|--------|
| Barcode not found in `product_barcodes` | `resolveBarcode` returns `null` |
| Barcode found but `product_id` not in `products` | `resolveBarcode` returns `null` |
| Product in `products` but not yet in `inventory_items` | `inventoryItemId = null` — caller must create item first |
| `scannedQty <= 0` | `resolveBarcodeQty` returns `null` |
| `qty` not provided and barcode resolution fails | `createInventoryMovement` throws |

---

## Key Functions (barcodeService.ts)

| Function | Input | Output |
|----------|-------|--------|
| `resolveBarcode(db, barcode, tenantId)` | raw scan string | `BarcodeResolution \| null` |
| `resolveBarcodeQty(db, barcode, tenantId, qty)` | scan + count | `{ resolution, baseQty } \| null` |
| `convertToBaseUnits(db, tenantId, productId, qty, fromUom, toUom)` | qty + UOMs | `UomConversionResult` |
| `getBarcodesForProduct(db, tenantId, productId)` | product | all barcodes |
| `getPrimaryBarcode(db, tenantId, productId)` | product | primary barcode string |
| `getConversionsForProduct(db, tenantId, productId)` | product | all conversion pairs |

---

## Smart Receiving Integration (Phase 4)

When Smart Receiving is built, the scan UI will:
1. Capture a barcode from a camera or handheld scanner
2. Call `resolveBarcodeQty(db, barcode, tenantId, scannedQty)`
3. Display `resolution.sku`, `resolution.uom`, `baseQty` for operator confirmation
4. On confirm, call `createInventoryMovement` with `movementType: "receive"` and the barcode params

The service layer is already ready. Only the UI needs to be built.
