# Outbound Stock Rules

This document is the canonical reference for how outbound fulfillment events
interact with the inventory ledger. All rules are implemented in
`lib/inventory/fulfillmentService.ts` and enforced via `lib/inventory/movementService.ts`.

## Balances at a glance

| Balance field | Meaning |
|---------------|---------|
| `on_hand`     | Physical units currently in the warehouse |
| `reserved`    | Subset of on_hand committed to active orders |
| `available`   | `on_hand − reserved` — what can be newly allocated |

No field ever goes below zero (enforced by `Math.max(0, …)` in `_applyBalanceDelta`).

## Movement rules

### reserve
- **When**: order is allocated via `POST /api/orders/[id]/allocate`
- **Effect**: `reserved += qty`; `on_hand` unchanged; `available` decreases
- **Invariant**: can only reserve up to `available` at time of write

### unreserve
- **When**:
  1. Order released via `POST /api/orders/[id]/release`
  2. Pick confirmation (written before the pick movement)
  3. Ship without prior pick (to clean up reserved balance)
- **Effect**: `reserved -= qty`; `on_hand` unchanged; `available` increases

### pick
- **When**: pick confirmed via `POST /api/tasks/[id]/pick`
- **Effect**: `on_hand -= qty`; `reserved` unchanged by this movement
- **Note**: an `unreserve` movement is **always** written first in the same pick
  operation so both `on_hand` and `reserved` land correctly

### pack
- **When**: task moves to packed state
- **Effect**: **no balance change** — purely administrative
- **Rationale**: stock was already decremented at pick time

### ship
- **When**: order shipped AND no prior pick movement exists for this item/order
- **Effect**: `on_hand -= qty` (covers the un-picked portion)
- **Guard**: `finalizeShipmentInventoryImpact()` checks for existing pick
  movements before writing `ship` to prevent double-decrement

### Why two movements at pick time?

The ledger tracks `on_hand` and `reserved` independently. A single pick event
needs to decrement both. Writing two explicit movements (`unreserve` + `pick`)
keeps the audit trail readable and auditable:

```
MOV-A  unreserve  -5  (commitment removed from reserved)
MOV-B  pick       -5  (units removed from on_hand)
```

If only `pick` were written, `reserved` would remain elevated even after the
item left the shelf — the `available` calculation would be wrong until rebuild.

## State transition table

| Event | on_hand | reserved | available | reservation.status |
|-------|---------|----------|-----------|-------------------|
| allocate | = | +qty | -qty | active |
| release | = | -remaining | +remaining | released |
| pick (full) | -qty | -qty | = | fulfilled |
| pick (partial) | -qty | -qty | = | partially_picked |
| ship (no pick) | -unpicked | -unpicked | = | fulfilled |
| cancel (pre-pick) | = | -reserved | +reserved | cancelled |

## Ship without pick (fast-ship path)

Some orders skip the pick step — e.g. a packed order shipped directly. In this
case `finalizeShipmentInventoryImpact()` is called from the ship API route and:

1. Finds all reservations for the order that are not yet fulfilled/released.
2. For each un-picked portion: writes `unreserve` + `ship`.
3. Marks all reservation records as `fulfilled`.

This is **not yet wired into the ship status transition** automatically — it
must be called explicitly. See "What is deferred" in `FULFILLMENT_LEDGER_INTEGRATION.md`.

## Cancellation

Cancelling an order that has active reservations requires calling
`POST /api/orders/[id]/release` first (or combining it in a future cancel
endpoint). The current `PATCH /api/orders/[id]` status route with
`status: "cancelled"` does **not** auto-release reservations — that clean-up
is the operator's responsibility until a combined cancel+release route is built.

## Partially-allocated orders

If `POST /api/orders/[id]/allocate` returns `partialAllocation: true`, some
lines were reserved and some were not (insufficient stock). The order is still
moved to `allocated`. The UI surfaces a warning listing the under-allocated SKUs.
The operator can:
- Accept partial allocation and proceed.
- Release the order, replenish stock, and re-allocate.

## Schema limitations

- `order_line_id` on `inventory_reservations` is nullable — see `RESERVATION_MODEL.md`.
- `inventory_balances` does not track per-location reserved quantities. All
  reservation math is at the item level across the whole warehouse.
- No partial-pick of a barcode scan path in Phase 6. Barcode-driven picks
  (Phase 3) can be added by passing `barcode` + `scannedQty` to the pick route
  in a future phase.
