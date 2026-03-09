# Barcode & Unit-of-Measure Model

**Phase:** 3
**Status:** IMPLEMENTED — migration staged (`20260309000002`), not yet applied to remote DB

---

## Overview

Phase 3 adds three tables and two service files that form the barcode/UOM foundation.
No existing tables or UI are modified. All changes are additive.

---

## Tables

### `uom_definitions` — Global UOM catalog

| Column | Type | Notes |
|--------|------|-------|
| `code` | text PK | `each`, `pack`, `case`, `pallet`, `kg`, `lb`, `liter`, `box` |
| `name` | text | Human-readable label |
| `description` | text | Optional long description |
| `is_base_unit` | boolean | True only for `each` — the canonical inventory unit |

No `tenant_id`. UOM codes are global. Products reference codes by FK from the other two tables.

Seeded on migration apply:

| code | name | is_base_unit |
|------|------|--------------|
| each | Each | ✓ |
| pack | Pack | |
| case | Case | |
| pallet | Pallet | |
| kg | Kilogram | |
| lb | Pound | |
| liter | Liter | |
| box | Box | |

---

### `product_barcodes` — One or more barcodes per product

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `tenant_id` | text FK → tenants | Multi-tenant isolation |
| `product_id` | text | FK → products.id |
| `barcode` | text | The scannable string |
| `barcode_type` | text | `EAN13` \| `EAN8` \| `UPC` \| `CODE128` \| `CODE39` \| `QR` \| `DATAMATRIX` |
| `uom_code` | text FK → uom_definitions | The unit this barcode represents |
| `quantity_per_unit` | integer | Base units per scan of this barcode |
| `is_primary` | boolean | Default lookup barcode for this product |
| `created_at` | timestamptz | |

**Uniqueness:** `(tenant_id, barcode)` — no two products in the same tenant share a barcode.

**Live seed data — PRD-001 (SKU-1001 Wireless Earbuds), tenant-1:**

| barcode | barcode_type | uom | quantity_per_unit | is_primary |
|---------|-------------|-----|-------------------|------------|
| 0000000000001 | EAN13 | each | 1 | ✓ |
| 0000000000002 | EAN13 | case | 24 | |
| 0000000000003 | EAN13 | pallet | 1440 | |

Scanning the case barcode once → 24 base units (eaches) written to ledger.

---

### `product_uom_conversions` — Explicit conversion factors per product

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `tenant_id` | text FK → tenants | |
| `product_id` | text | FK → products.id |
| `from_uom` | text FK → uom_definitions | Source unit |
| `to_uom` | text FK → uom_definitions | Target unit |
| `conversion_factor` | numeric(14,6) | Multiply from_uom qty to get to_uom qty |

**Uniqueness:** `(tenant_id, product_id, from_uom, to_uom)`

**Example — same product:**

| from_uom | to_uom | conversion_factor |
|----------|--------|-------------------|
| case | each | 24 |
| pallet | case | 60 |
| pallet | each | 1440 |

The service handles both direct and inverse lookups automatically. No need to store both `case→each` and `each→case`.

---

## Service Files

| File | Purpose |
|------|---------|
| `lib/inventory/barcodeService.ts` | Barcode resolution, UOM conversion, product barcode CRUD reads |
| `lib/inventory/movementService.ts` | Extended: accepts `barcode` + `scannedQty` in `CreateMovementParams` |

Both are **server-side only**. Never import from client components.

---

## Constraints & Indexes

- `product_barcodes(tenant_id, barcode)` — unique constraint (no shared barcodes within tenant)
- `product_barcodes_tenant_barcode_idx` — fast lookup by barcode scan
- `product_barcodes_product_idx` — fast lookup of all barcodes for a product
- `product_uom_conversions_product_idx` — fast lookup of conversions for a product
- RLS disabled on all three tables (development phase, consistent with other tables)
