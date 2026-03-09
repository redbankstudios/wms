# Unknown Barcode Learning

**Phase:** 5
**Status:** IMPLEMENTED

---

## Overview

When a warehouse operator scans a barcode that is not registered in `product_barcodes`,
the system captures an `unknown_barcode` exception. A supervisor can then resolve it by
mapping the barcode to the correct product, UOM, and quantity multiplier.

After resolution, the barcode is saved into `product_barcodes`. Future scans of that
barcode will resolve automatically through `barcodeService.resolveBarcode()` — no
further human intervention needed.

---

## Flow

```
Operator scans unknown barcode "XYZ-999"
    │
    ▼
recordReceivingScan()
    ├── resolveBarcode() returns null  →  unknown_barcode
    ├── receiving_scans row: outcome = "exception", exception_code = "unknown_barcode"
    └── receiving_exceptions row: status = "open", barcode = "XYZ-999"
    │
    ▼
Supervisor opens exception in UI
    ├── Selects product  (e.g. PRD-002 / SKU-1002 Smart Watch)
    ├── Selects UOM      (e.g. "each")
    ├── Enters qty/unit  (e.g. 1)
    └── Checks "Re-post scan to ledger" if scan should count
    │
    ▼
PATCH /api/receiving/exceptions/:id  { action: "resolve_barcode", ... }
    │
    ├── attachBarcodeToProduct()
    │     └── INSERT INTO product_barcodes (id, tenant_id, product_id, barcode, ...)
    │
    ├── receiving_exceptions.status = "resolved"
    │   resolution_action = "barcode_saved" (or "reposted" if scan was re-posted)
    │
    └── [if repostScan = true and scan not yet posted]
          ├── receiving_scans.outcome = "matched"
          └── postReceivingScanToLedger()
                └── createInventoryMovement(movementType: "receive")
    │
    ▼
Future scan of "XYZ-999"
    └── resolveBarcode() finds new row  →  matched  →  posted to ledger automatically
```

---

## Uniqueness Rules

- One barcode string per tenant (enforced by `UNIQUE (tenant_id, barcode)` in `product_barcodes`)
- If the same barcode is already registered to the **same** product → idempotent, returns existing row
- If the same barcode is already registered to a **different** product → `409 Conflict` with clear message

---

## Re-post After Resolution

When a supervisor resolves an unknown_barcode exception and checks "Re-post scan to ledger":

1. The original `receiving_scans` row has its `outcome` updated from `exception` → `matched`
2. `postReceivingScanToLedger()` is called — writes a `receive` movement
3. `receiving_scans.movement_id` is populated
4. `receiving_exceptions.resolution_action` is set to `"reposted"`

**Precondition**: the scan must have a valid `inventory_item_id`. If the resolved product
has no `inventory_items` row (product not yet stocked), the re-post is skipped with a
console warning. The supervisor must create the inventory item first.

---

## What Is Still Deferred

- **AI/ML barcode suggestion** — auto-suggest product based on barcode prefix, image, or similar barcodes
- **Bulk resolution** — resolve many unknown barcodes from the same product at once
- **OCR barcode capture** — reading barcodes from photos
- **GS1 / GTIN lookup** — external barcode registry integration
