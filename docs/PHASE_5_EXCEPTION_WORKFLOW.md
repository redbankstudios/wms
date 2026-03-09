# Phase 5: Exception Resolution + Unknown Barcode Learning

**Status:** IMPLEMENTED (2026-03-09)

---

## Summary

Phase 5 adds the human-in-the-loop operational layer that turns receiving exceptions
into system knowledge. Supervisors can review, approve, reject, and resolve exceptions
raised during Phase 4 receiving sessions.

The most important capability is **unknown barcode learning**: when an unrecognized
barcode is scanned, a supervisor maps it to a product and saves it permanently —
all future scans of that barcode resolve automatically.

---

## Components

| Component | Path |
|-----------|------|
| DB migration | `supabase/migrations/20260309000004_extend_exceptions.sql` |
| Exception service | `lib/inventory/receivingExceptionService.ts` |
| API — list | `app/api/receiving/exceptions/route.ts` |
| API — detail/action | `app/api/receiving/exceptions/[id]/route.ts` |
| UI — panel | `components/screens/inbound.tsx` → `ExceptionsPanel` |
| Docs | `docs/RECEIVING_EXCEPTION_RESOLUTION.md` |
| Docs | `docs/UNKNOWN_BARCODE_LEARNING.md` |

---

## Exception Handling by Type

| Exception | Recommended action | Ledger impact |
|-----------|-------------------|---------------|
| `unknown_barcode` | `resolve_barcode` — map to product, save barcode | Optional repost |
| `sku_mismatch` | `approve` or `reject` + notes | None |
| `overage` | `approve` (accept extra stock) or `reject` (send back) | None (manual adj. if needed) |
| `shortage` | `approve` (accept short delivery) or `reject` | None |
| `damaged` | `approve` or `reject` + notes | None |
| `missing_item` | `approve` or `reject` + notes | None |

Only `resolve_barcode` can trigger an automatic ledger posting (when `repostScan = true`).
All other resolutions are administrative — they do not automatically adjust inventory.
Manual inventory adjustments should go through the Inventory screen if needed.

---

## Ledger Posting Rules

Ledger writes only happen in two scenarios in Phase 5:

1. **resolve_barcode + repostScan = true**: the original exception scan is re-posted
   as a `receive` movement after the barcode is saved.

2. All other resolutions are **administrative only** — they update exception metadata
   but do not touch `inventory_movements` or `inventory_balances`.

This is intentional. Automatically adjusting stock for overages, shortages, or
mismatches without deliberate operator action could corrupt inventory accuracy.

---

## Barcode Learning — Persistence

Once a barcode is saved via `resolve_barcode`:

- Row inserted into `product_barcodes` (tenant-scoped, unique per barcode)
- `barcodeService.resolveBarcode()` will find it on the next scan
- Subsequent receiving sessions will match automatically — no exception raised
- The resolution is permanent and audited via the `events` table

---

## UI Location

Exceptions panel appears **within the Receiving tab** of any inbound shipment:
- Shows only `open` exceptions
- Each row expands to reveal the resolution form
- `unknown_barcode`: product picker + UOM + qty_per_unit + re-post checkbox
- Other types: notes input + Approve / Dismiss / Reject buttons
- Auto-refreshes after each exception scan and after each resolution

---

## What Is Still Deferred

- **Exception queue screen** — standalone supervisor view across all shipments
- **Exception bulk actions** — resolve multiple exceptions at once
- **RLS** — all tables still have RLS disabled
- **AI/ML product suggestion** for unknown barcodes
- **Notification** — alert supervisor when new exceptions are raised
- **Audit trail UI** — view who resolved what and when
