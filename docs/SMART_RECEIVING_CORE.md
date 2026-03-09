# Smart Receiving Core

**Phase:** 4
**Status:** IMPLEMENTED — migration staged (`20260309000003`), not yet applied to remote DB

---

## Overview

Smart Receiving is the scan-driven inbound process that captures what physically arrives
against what was expected on the purchase order / shipment manifest.

It produces an immutable audit trail (via the inventory ledger) and raises exceptions
for any discrepancies that need operator review.

---

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| Migration | `supabase/migrations/20260309000003_add_receiving.sql` | 3 new tables |
| Service | `lib/inventory/receivingService.ts` | Core business logic |
| API — sessions | `app/api/receiving/sessions/route.ts` | Open session |
| API — session detail | `app/api/receiving/sessions/[id]/route.ts` | Summary + finalize |
| API — scans | `app/api/receiving/scans/route.ts` | Record + post scan |
| UI | `components/screens/inbound.tsx` → `ReceivingTab` | Operator receiving panel |
| Docs | `docs/RECEIVING_SESSION_MODEL.md` | Session lifecycle |
| Docs | `docs/RECEIVING_EXCEPTION_RULES.md` | Exception types + handling |

---

## Data Flow

```
Operator opens inbound shipment → clicks "Receiving" tab
    │
    ▼
POST /api/receiving/sessions
    → openReceivingSession() — creates receiving_sessions row
    → sets inbound_shipment.status = "receiving"
    │
    ▼
Operator scans each barcode (or enters SKU manually)
    │
    ▼
POST /api/receiving/scans  { barcode, scannedQty, postToLedger: true }
    │
    ├── recordReceivingScan()
    │     ├── resolveBarcode() → productId, sku, uom, quantityMultiplier
    │     ├── resolvedBaseQty = scannedQty × quantityMultiplier
    │     ├── _expectedBySku() → query inbound_box_items for this shipment
    │     ├── Compare: matched | overage → exception | sku_mismatch → exception
    │     └── Insert receiving_scans row
    │
    └── postReceivingScanToLedger()  (if postToLedger = true and outcome ≠ exception)
          └── createInventoryMovement(movementType: "receive")
                → inventory_movements row
                → inventory_balances updated
                → inventory_items.qty mirrored
    │
    ▼
Operator clicks "Finalize"
    │
    ▼
PATCH /api/receiving/sessions/[id]  { action: "finalize" }
    │
    ├── finalizeReceivingSession()
    │     ├── Compute received-by-sku from posted scans
    │     ├── Compare vs expected manifest → raise shortage exceptions
    │     └── Update session.status = "completed"
    │
    └── Return ReceivingSessionSummary { reconciliation, openExceptions }
```

---

## API Endpoints

### `POST /api/receiving/sessions`
Open (or resume) a receiving session for a shipment.
- Body: `{ tenantId, shipmentId, operatorUserId?, notes? }`
- Returns: `{ sessionId }`
- Side effect: `inbound_shipments.status` → `"receiving"`

### `GET /api/receiving/sessions/:id?tenantId=`
Returns full session summary including reconciliation map and open exceptions.

### `PATCH /api/receiving/sessions/:id`
- Body: `{ tenantId, action: "finalize" | "pause" | "cancel" }`
- `finalize`: closes session, raises shortage exceptions, returns summary
- `pause`: sets status = "paused" (session can be reopened)
- `cancel`: sets status = "cancelled", records closed_at

### `POST /api/receiving/scans`
Record a barcode scan and optionally post to ledger in one call.
- Body: `{ tenantId, sessionId, shipmentId, barcode?, sku?, scannedQty?, postToLedger? }`
- Returns: `{ scanId, outcome, resolvedSku, resolvedBaseQty, expectedQty, exceptionCode, movementId? }`

---

## Roles Required

All receiving endpoints require one of:
- `warehouse_manager`
- `business_owner`
- `platform_owner`

Dev-mode bypass applies (no session = skipped in `NODE_ENV=development`).

---

## Apply the Migration

```bash
supabase db push
```

Then seed test barcodes if needed (see `docs/BARCODE_AND_UOM_MODEL.md`).
