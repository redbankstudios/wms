# UOM Conversion Rules

**Phase:** 3
**Status:** IMPLEMENTED

---

## Base Unit

The canonical inventory unit is **`each`** (`is_base_unit = true` in `uom_definitions`).

All ledger `qty_delta` values are stored in **eaches**. All `inventory_balances.on_hand` values are in eaches. The UI displays pallets for storage screens because `inventory_items.qty` is set from `inventory_balances.on_hand` — no conversion needed there (pallets are tracked separately via `storage_locations.current_pallets`).

---

## Conversion Factor Semantics

```
conversion_factor = how many to_uom units you get from 1 from_uom unit
```

Examples:

| from_uom | to_uom | factor | Meaning |
|----------|--------|--------|---------|
| case | each | 24 | 1 case = 24 eaches |
| pallet | case | 60 | 1 pallet = 60 cases |
| pallet | each | 1440 | 1 pallet = 1440 eaches (60 × 24) |
| pack | each | 6 | 1 6-pack = 6 eaches |
| kg | each | 1 | weight UOM — 1:1 if product sold by weight |

**Formula:**

```
converted_qty = input_qty × conversion_factor
```

---

## Lookup Priority

`convertToBaseUnits(db, tenantId, productId, qty, fromUom, toUom)` resolves in this order:

1. **Direct match** — `product_uom_conversions` WHERE `from_uom = ? AND to_uom = ?`
2. **Inverse match** — same table WHERE `from_uom = to_uom AND to_uom = from_uom`, factor = `1 / stored_factor`
3. **Barcode fallback** — `product_barcodes.quantity_per_unit` for the `from_uom`
4. **1:1 passthrough** — logs a warning, returns `qty` unchanged

---

## Chaining Conversions

The service does **not** automatically chain conversions. If you need `pallet → each` and
only have `pallet → case` and `case → each` stored, you must either:

- Store the direct `pallet → each` conversion explicitly, OR
- Call `convertToBaseUnits` twice (pallet → case, then case → each)

Recommendation: always store the direct `{uom} → each` conversion for any UOM you use.
This avoids chaining and makes resolution predictable.

---

## Whole-Unit Rounding

Inventory is tracked in whole base units. `convertToBaseUnits` always returns
`Math.round(qty × factor)`. For fractional conversions (e.g. weight-based), callers should
be aware that rounding occurs.

---

## Per-Product Conversions

Conversions are stored per `(tenant_id, product_id)` — not globally. Two products from the
same tenant can have different case sizes:

- Product A: case → each = 24
- Product B: case → each = 12

This models real-world variability (different suppliers, different pack sizes).

---

## Barcode vs Conversion Priority

When `createInventoryMovement` is called with a `barcode`:

1. `resolveBarcodeQty` runs → uses `product_barcodes.quantity_per_unit` directly
2. **No call to `convertToBaseUnits`** — `quantity_per_unit` on the barcode row IS the multiplier

`convertToBaseUnits` is used when you have a qty in a known UOM but no barcode (e.g. operator
types "3 cases" manually without scanning). For scan-driven flows, `quantity_per_unit` on the
barcode row is authoritative.

---

## Adding New UOMs

1. Insert into `uom_definitions`:
   ```sql
   insert into public.uom_definitions (code, name, description, is_base_unit)
   values ('inner', 'Inner Pack', 'Inner carton within a case', false);
   ```

2. Add `product_uom_conversions` rows for each product that uses the new UOM:
   ```sql
   insert into public.product_uom_conversions
     (id, tenant_id, product_id, from_uom, to_uom, conversion_factor)
   values
     ('PUC-XXX', 'tenant-1', 'PRD-001', 'inner', 'each', 6);
   ```

3. Optionally add a barcode row with `uom_code = 'inner'`.

No code changes required — the service resolves dynamically from the DB.
