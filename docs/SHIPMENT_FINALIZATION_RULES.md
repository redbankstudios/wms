# Shipment Finalization Rules — Phase 7

## Purpose

This document defines exactly how inventory balances change when an order is
shipped, covering all pick combinations to prevent double-decrement.

---

## Core invariant

> **On-hand must never be decremented twice for the same units.**

This is enforced structurally by `finalizeShipmentInventoryImpact()` in
`lib/inventory/fulfillmentService.ts`, which checks `picked_qty` per reservation
row before writing any `ship` movement.

---

## Balance dimensions

| Dimension   | Meaning                                          |
|-------------|--------------------------------------------------|
| `on_hand`   | Total units physically in the warehouse           |
| `reserved`  | Subset of on_hand allocated to open orders        |
| `available` | `on_hand − reserved` (can be sold/allocated now)  |

---

## Movement types involved in outbound flow

| Movement      | `on_hand` | `reserved` | When written                          |
|---------------|-----------|------------|---------------------------------------|
| `reserve`     | —         | +qty       | At allocation (`/allocate`)            |
| `unreserve`   | —         | −qty       | At pick, release, cancel, or fast-ship |
| `pick`        | −qty      | —          | When picker confirms physical pick     |
| `pack`        | —         | —          | Administrative; no balance change      |
| `ship`        | −qty      | —          | At ship, only for unpicked qty         |

---

## Scenario matrix

### Scenario A — Fully picked before ship

| State before ship | picked_qty | reserved_qty | Ship movement written? |
|-------------------|------------|--------------|------------------------|
| All fulfilled     | 10         | 10           | **No** — noop          |

On-hand was already decremented at each `pick`. Reservation status is already
`fulfilled`. `finalizeShipmentInventoryImpact` iterates reservations, sees
`unpickedQty = 0`, skips the ship movement, confirms reservation as `fulfilled`.

**Result:** `on_hand` unchanged at ship time. No double-decrement possible.

---

### Scenario B — Not picked at all (fast-ship / express)

| State before ship | picked_qty | reserved_qty | Ship movement written? |
|-------------------|------------|--------------|------------------------|
| active            | 0          | 10           | **Yes** — qty 10        |

Steps:
1. `unreserve` movement written for qty 10 → `reserved −10`.
2. `ship` movement written for qty 10 → `on_hand −10`.
3. Reservation status → `fulfilled`.

**Result:** Stock leaves warehouse correctly. Reserved balance is zeroed.

---

### Scenario C — Partially picked before ship

| State before ship  | picked_qty | reserved_qty | Ship movement written?       |
|--------------------|------------|--------------|------------------------------|
| partially_picked   | 6          | 10           | **Yes** — qty 4 (remainder)  |

Steps:
1. `unpickedQty = reserved_qty − picked_qty = 4`.
2. `unreserve` movement written for qty 4 → `reserved −4`.
3. `ship` movement written for qty 4 → `on_hand −4`.
4. Reservation status → `fulfilled`.

On-hand was already decremented by 6 at pick time. Ship decrements the
remaining 4. Total on-hand impact = 10 = full order quantity. Correct.

---

### Scenario D — No reservations (order never allocated)

If an order was never allocated (e.g. created manually, no `/allocate` call),
`finalizeShipmentInventoryImpact` finds zero reservation rows. It writes no
ship movements. The order status advances to `shipped` but **no stock impact
occurs**. This is intentional — allocation is required for ledger-tracked orders.

This gap is visible in the audit event: `shipMovementsWritten: 0`.

---

## Shipment record lifecycle

| Event            | `shipments.shipment_status` | `shipments.shipped_at` |
|------------------|-----------------------------|------------------------|
| Order allocated  | (no record yet)              | —                      |
| Pack confirmed   | `pack_confirmed`             | —                      |
| Ship finalized   | `shipped`                    | set                    |
| Order cancelled  | `cancelled`                  | —                      |

---

## What is still deferred

- Shipment weight/dimensions recorded at pack time.
- Multi-leg shipments (one order → multiple shipment records per carrier segment).
- Carrier tracking number written to `shipments` at ship time.
- Reverse-ship (return stock back to on_hand via `return_restock` movement).
