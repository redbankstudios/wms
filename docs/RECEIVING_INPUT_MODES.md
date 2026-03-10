# Receiving Input Modes

The receiving tab supports two distinct input modes. The operator selects the
mode via a segmented toggle above the scan field. Default is **Scan Barcode**.

---

## Scan Barcode mode

The standard warehouse path. Use a barcode scanner or type a barcode string.

**Resolution flow:**
1. Input is passed to `resolveBarcode()` in `barcodeService.ts`.
2. If the barcode is registered in `product_barcodes` → matched to SKU + UOM,
   resolvedBaseQty is calculated using the UOM multiplier.
3. If the barcode is **not** registered → `unknown_barcode` exception is raised.
   The operator can map the barcode to a product in the Exceptions panel
   (barcode-learning workflow).
4. If matched SKU is not in the shipment manifest → `sku_mismatch` exception.
5. If received qty > expected → `overage` exception.

**Result feedback shown inline:**
- Success: `SKU-XXXX · Barcode matched · each · qty N`
- Unknown barcode: `Unknown barcode · Save and map this barcode to a product`
- Other exceptions: exception code + "see panel below"

---

## Manual SKU mode

Fallback path for operators who know the SKU but do not have a barcode to scan
(e.g. damaged label, unlabelled pallet, or quick ad-hoc entry).

**Resolution flow:**
1. Input is passed directly as a SKU string.
2. The service looks up `inventory_items` by `sku` for this tenant.
3. If **not found** → `SkuNotFoundError` is thrown. The API returns HTTP 422
   with `code: "sku_not_found"`. **No scan row is created. No exception is raised.**
4. If found → proceeds identically to a resolved barcode scan (manifest check,
   overage detection, ledger posting).

**Result feedback shown inline:**
- Success: `SKU-XXXX · Manual SKU match · SKU-XXXX`
- Not found: `SKU not found` (red, no exception raised)

---

## Why manual SKU does not trigger barcode exceptions

Barcode exceptions exist specifically to support the **barcode-learning workflow**:
an operator scans a physical label → the system records the unknown string →
a supervisor maps it to a product → future scans of that barcode are resolved
automatically.

Manual SKU entry bypasses this workflow entirely. The operator already knows
the SKU — there is no barcode string to register. Raising an `unknown_barcode`
exception for a deliberate SKU entry would pollute the exception queue with
non-issues and confuse the barcode-learning resolution UI.

When a typed SKU is not found, it is a simple operator typo, not a
barcode-discovery event.

---

## Server-side contract

`recordReceivingScan()` accepts `entryMode: "barcode" | "sku"` in its input.

| entryMode | barcode missing | sku missing in inventory_items |
|-----------|-----------------|-------------------------------|
| `"barcode"` | unknown_barcode exception | N/A |
| `"sku"` | N/A | throws `SkuNotFoundError` (no scan row) |

`POST /api/receiving/scans` maps `entryMode` from the request body and catches
`SkuNotFoundError` → returns `{ error: "...", code: "sku_not_found" }` HTTP 422.
