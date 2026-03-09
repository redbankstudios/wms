# Barcode / SKU Handling Analysis

## 1) Current barcode data model

### Persisted barcode fields
- `products.barcode` (single optional text value).
- No separate barcode table exists (no `product_barcodes`, no alias table, no history table).

### Related SKU fields
- `products.sku` is the primary product identifier in app flows.
- `inventory_items.sku` stores SKU snapshots per inventory row.
- `inbound_box_items.sku` stores expected inbound SKU at carton-item level.

## 2) Barcode lookup and retrieval behavior
- Provider supports product lookup by SKU only:
  - `products.getProductBySku(tenantId, sku)`
- No provider method for lookup by barcode.
- No barcode uniqueness constraint found in migrations.

## 3) Scan functionality in current UI

### Warehouse worker app
- `components/screens/mobile-worker.tsx` shows scan states (`idle -> scanning -> success`) with a `Simulate Scan` button.
- No scanner SDK integration.
- No decoded barcode value is read, validated, or persisted.

### Driver app
- `components/screens/mobile-driver.tsx` shows “Scan Packages” UI, but flow proceeds via POD states.
- No persisted package-scan records are written.

### Other screens
- No barcode scan event table writes found in provider layer.
- No audit/event ingestion for scan actions in UI flows.

## 4) Multi-barcode, case-pack, and conversion support

### Multi-barcode per SKU
- Not supported in persisted model (single `products.barcode` only).

### Case/pack conversions
- Core persisted product table has no `units_per_case`/UOM structure.
- `B2BProduct.unitsPerCase` exists in TypeScript/UI models, but this is not persisted through `products` provider methods.
- `inventory_items.product_units` exists, but this is a quantity field, not a conversion rule engine.

## 5) Current assumptions in implementation
- SKU is treated as canonical operational identifier.
- Barcode is optional metadata on product, not a first-class operational key.
- Scan flows are currently demonstrative UI behavior.

## 6) Limitations
- No universal barcode resolution service.
- No support for multiple supplier/customer barcodes per product.
- No unknown-barcode capture/learning workflow.
- No scan confidence, mismatch, or exception model.
- No scan-to-receiving transaction linkage.

## UNKNOWN
- UNKNOWN: whether external systems populate additional barcode mappings directly in a remote DB not represented by local migrations.
