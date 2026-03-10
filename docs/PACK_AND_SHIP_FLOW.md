# Pack and Ship Flow — Phase 7

## Overview

Phase 7 adds explicit, ledger-aware pack and ship transitions to the outbound
execution chain. The key distinction is that **pack is administrative** (no stock
change) while **ship is the definitive stock-impact event** for any inventory not
already decremented via the pick workflow.

---

## Status flow

```
pending → allocated → picking → packed → shipped → in_transit → delivered
```

Pack and ship now go through dedicated API endpoints instead of the generic
PATCH `/api/orders/[id]` route. This ensures inventory movements are written
correctly regardless of whether a pick workflow was used.

---

## Pack (`POST /api/orders/[id]/pack`)

### Allowed source statuses
- `picking`
- `processing`

### What it does
1. Validates order is in a packable state.
2. Calls `confirmPackForOrder()` in `lib/inventory/shippingService.ts`:
   - Creates or updates the `shipments` record for this order.
   - Sets `shipment_status = pack_confirmed`, `packed_at = now()`.
   - Sets `packed_by_user_id` from the authenticated actor.
3. Advances `order.status → packed`.
4. Writes an audit event `order.pack_confirmed`.

### Stock impact
**None.** Pack is purely administrative. Inventory balances are unchanged.

### Idempotency
Safe to call if a shipment record already exists — it updates `packed_at` and
`shipment_status` on the existing row.

---

## Ship (`POST /api/orders/[id]/ship`)

### Allowed source statuses
- `packed` (standard path — pack confirmation happened first)
- `picking` / `processing` (fast-ship path — pack step skipped)

### What it does
1. Validates order is in a shippable state.
2. Calls `finalizeShipmentForOrder()` in `lib/inventory/shippingService.ts`:
   a. Delegates to `finalizeShipmentInventoryImpact()` (fulfillmentService):
      - Fetches all `inventory_reservations` for this order.
      - For each reservation where `reserved_qty − picked_qty > 0`:
        - Writes an `unreserve` movement (removes from reserved balance).
        - Writes a `ship` movement (decrements on_hand).
      - For each reservation where `picked_qty == reserved_qty`:
        - No ship movement written — on_hand was already decremented at pick.
        - Marks reservation as `fulfilled`.
   b. Creates or updates the `shipments` record with `shipped_at = now()`.
3. Advances `order.status → shipped`.
4. Writes an audit event `order.shipped` with `shipMovementsWritten` count.

### Double-decrement prevention
The service checks `picked_qty` per reservation before writing any `ship`
movement. If the full reserved quantity was already picked, the ship movement
is skipped entirely for that line. It is structurally impossible to decrement
on_hand twice for the same units.

### Fast-ship path
When an order skips the explicit pack step (e.g., high-velocity fulfillment),
`/ship` still works correctly. The audit event includes `fastShip: true`.

---

## Dispatch Queue integration

When a dispatcher clicks "Add to Route" in the Dispatch Queue:
1. A route stop is created for the assigned driver (best-effort).
2. `POST /api/orders/[id]/ship` is called (not a loose status PATCH).
3. This ensures inventory is always correctly finalized at dispatch time,
   even if the warehouse team did not explicitly click "Ship Order" in the
   Orders screen.

---

## What is deferred

- Label generation (carrier label, barcode)
- Cartonization / box assignment
- Shipment weight/dimensions capture at pack time
- Carrier API integration (rates, tracking)
- Multi-shipment orders (one order → multiple shipment records)
