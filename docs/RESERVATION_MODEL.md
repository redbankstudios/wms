# Reservation Model

## Purpose

`inventory_reservations` provides a durable, per-order audit trail of what
inventory was committed to an order, how much of that commitment has been
physically picked, and the current lifecycle state.

It works **alongside** `inventory_balances.reserved` — the balance is the
aggregate derived state; the reservations table is the line-level breakdown.

## Schema

```sql
inventory_reservations (
  id                 text        PRIMARY KEY,           -- e.g. RES-1234567890-ABCD
  tenant_id          text        NOT NULL,
  order_id           text        NOT NULL,
  order_line_id      text,       -- nullable (see limitations below)
  inventory_item_id  text        NOT NULL,
  sku                text        NOT NULL,
  reserved_qty       integer     NOT NULL CHECK > 0,
  picked_qty         integer     NOT NULL DEFAULT 0,
  status             text        NOT NULL DEFAULT 'active',
  movement_id        text,       -- back-ref to the reserve movement that created this row
  created_at         timestamptz,
  updated_at         timestamptz
)
```

## Status lifecycle

```
active
  ├─ some qty picked     → partially_picked
  │    └─ all qty picked → fulfilled
  └─ released before any pick → released
  └─ order cancelled before any pick → cancelled

partially_picked
  ├─ remaining picked    → fulfilled
  └─ released            → released  (only un-picked portion unreserved)
```

Transitions are enforced in `fulfillmentService.ts` — the status field is
never written directly from the UI or API without going through the service.

## Relationship to inventory_balances

```
inventory_balances.reserved
  = SUM(reservation.reserved_qty - reservation.picked_qty)
    WHERE status IN ('active', 'partially_picked')
```

This invariant is maintained by the movement service:
- `reserve` movement: `reserved_qty` set, `reserved += qty` in balances.
- `unreserve` movement (at pick or release): `reserved -= qty` in balances.
- The `picked_qty` counter on the reservation is updated by the pick route.

If the numbers drift (e.g. after a crash mid-write), run
`rebuildInventoryBalanceForItem()` to replay movements and restore consistency.

## Limitation: order_line_id is nullable

The current `createOrder` flow in the UI does not always persist `order_lines`
rows with stable IDs — in some paths the lines are created as part of order
creation with server-generated IDs that are not returned to the UI. Therefore:

- `order_line_id` is intentionally nullable.
- When the UI provides `orderLineId` in the allocate payload, it is stored.
- When it is absent, the reservation is order-level (one reservation per
  inventory item per order), which is sufficient for the current workflow.

Future work: persist order_lines IDs in the createOrder response and thread
them through to the allocate payload for full line-level traceability.

## Indexes

```sql
inv_res_tenant_idx      ON (tenant_id)
inv_res_order_idx       ON (order_id)
inv_res_item_idx        ON (inventory_item_id)
inv_res_status_idx      ON (status)
inv_res_order_item_idx  ON (order_id, inventory_item_id)
```

## RLS

RLS is **disabled** on `inventory_reservations`, consistent with all other
tables in the current development phase. All writes go through server-side API
routes that enforce tenant isolation via payload validation + Supabase admin
client. See `docs/RLS_ROLLOUT_PLAN.md` for the planned RLS activation path.
