# Fulfillment Ledger Integration — Phase 6

## Overview

Phase 6 adds inventory-aware outbound fulfillment to the WMS. Every allocation,
pick, and ship event is now backed by a durable ledger entry in
`inventory_movements` and a reservation record in `inventory_reservations`.

## New files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260309000005_add_fulfillment_ledger.sql` | Adds `inventory_reservations` table |
| `lib/inventory/fulfillmentService.ts` | Server-side helpers: reserve, release, pick, ship, summary |
| `app/api/orders/[id]/allocate/route.ts` | POST — reserve inventory for an order |
| `app/api/orders/[id]/release/route.ts` | POST — release reservations, revert to pending |
| `app/api/orders/[id]/reservation/route.ts` | GET — reservation summary for UI |
| `app/api/tasks/[id]/pick/route.ts` | POST — confirm pick, write ledger movements |

## Order status model (extended)

```
pending → allocated → picking → packed → shipped → in_transit → delivered
                ↓
            (release)
                ↓
            pending
```

- `pending → allocated`: triggered by `POST /api/orders/[id]/allocate`
- `allocated → pending`: triggered by `POST /api/orders/[id]/release`
- `allocated → picking`: auto-advanced on first confirmed pick (best-effort), or manually via status PATCH
- `picking → packed` and beyond: unchanged from pre-Phase-6 flow

## Ledger movement sequence for a full fulfillment

```
1. reserve      reserved += qty     (on_hand unchanged)
2. unreserve    reserved -= qty     (on_hand unchanged)  ← written at pick time
3. pick         on_hand  -= qty     (reserved unchanged) ← written at pick time
4. pack         no balance change   (administrative)
5. ship         no balance change   (pick already decremented on_hand)
```

If an order is shipped **without** a prior pick (e.g. fast-ship path), the
`finalizeShipmentInventoryImpact` helper writes `ship` + `unreserve` to cover
the un-picked portion.

## API reference

### POST /api/orders/[id]/allocate

```json
{
  "tenantId": "tenant-1",
  "lines": [
    { "inventoryItemId": "INV-001", "sku": "SKU-100", "qty": 5 },
    { "inventoryItemId": "INV-002", "sku": "SKU-101", "qty": 3, "orderLineId": "OL-99" }
  ]
}
```

Response `200`:
```json
{
  "ok": true,
  "orderId": "ORD-001",
  "reserved": [ { "reservationId": "RES-…", "inventoryItemId": "INV-001", "sku": "SKU-100", "qty": 5 } ],
  "insufficient": [],
  "partialAllocation": false
}
```

Response `422` (all lines insufficient):
```json
{ "error": "Insufficient stock for all lines…", "insufficient": [ … ] }
```

### POST /api/orders/[id]/release

```json
{ "tenantId": "tenant-1" }
```

Response `200`:
```json
{ "ok": true, "orderId": "ORD-001", "releasedReservations": ["RES-…"] }
```

### GET /api/orders/[id]/reservation?tenantId=tenant-1

Response `200`:
```json
{
  "orderId": "ORD-001",
  "lines": [
    {
      "reservationId": "RES-…",
      "inventoryItemId": "INV-001",
      "sku": "SKU-100",
      "orderLineId": null,
      "reservedQty": 5,
      "pickedQty": 0,
      "status": "active",
      "balance": { "on_hand": 40, "reserved": 5, "available": 35 }
    }
  ],
  "totalReserved": 5,
  "totalPicked": 0,
  "fullyAllocated": true,
  "allPicked": false
}
```

### POST /api/tasks/[id]/pick

```json
{
  "tenantId": "tenant-1",
  "reservationId": "RES-…",
  "pickedQty": 5,
  "note": "Picked from R-01-A-1-1"
}
```

Response `200`:
```json
{
  "ok": true,
  "taskId": "TASK-001",
  "reservationId": "RES-…",
  "pickedQty": 5,
  "unreserveMovementId": "MOV-…",
  "pickMovementId": "MOV-…",
  "newReservationStatus": "fulfilled"
}
```

## UI integration

In `components/screens/orders.tsx`:
- Expanded order row shows an **Inventory Allocation** panel.
- `pending` orders show an **"Allocate Inventory"** button → opens a modal where
  the operator enters `inventoryItemId`, `SKU`, and `qty` per line.
- `allocated` / `picking` orders show a **"Release"** button.
- The panel displays a table of reservation lines with columns: SKU, Reserved,
  Picked, Available (live from `inventory_balances`), State.
- Partial allocation warnings (amber) and hard errors (red) are surfaced inline.

## Authentication

All routes use `resolveAuth()`:
- In **development** with no session: dev-bypass is active (warns in console).
- In **production**: full auth + tenant + role checks enforced before any write.

Audit events are logged to the `events` table for every allocation, release,
and pick operation.
