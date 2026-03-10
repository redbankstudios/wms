# Staging to Storage Rules — Phase 9

## Where received inventory lands

When a receiving scan is posted to the ledger via
`postReceivingScanToLedger` in `lib/inventory/receivingService.ts`, the
resulting `receive` movement is written with:

```
to_location = STAGING-{inbound_shipment_id}
```

Example: `STAGING-SHIP-20260310-001`

This records the physical staging location in the movement audit trail.
At this point:
- `inventory_balances.on_hand` increases ✓
- `inventory_items.qty` increases (mirrored) ✓
- `inventory_items.location` is **NOT** updated ✗

The item's location field retains whatever value it had before receiving
(its prior rack/bin, or empty if it's a brand new SKU).

## Staging location convention

| Pattern | Example | Meaning |
|---|---|---|
| `STAGING-{shipmentId}` | `STAGING-SHIP-20260310-001` | Shipment-specific dock staging area |

This is a **text convention only**. No row in `storage_locations`,
`warehouse_zones`, or `racks` is required. The dock door number is
available from `inbound_shipments.dock_door` for physical reference.

## When inventory_items.location is updated

`inventory_items.location` is updated **only** when a putaway task is
confirmed via `POST /api/tasks/{id}/putaway`. At that point:

```
inventory_items.location = destinationLocation   (e.g. "R-01-A-2-3")
```

This is done in `confirmPutawayTask` in `lib/inventory/putawayService.ts`
after the `putaway` ledger movement is written.

## Balance impact summary

| Event | on_hand | reserved | location |
|---|---|---|---|
| Receive scan posted | +qty | — | unchanged |
| Putaway confirmed | — | — | updated to destination |
| Pick confirmed | -qty | -reserved | unchanged |

## Ledger movements written

### Receive (at scan post)
```
movement_type = "receive"
qty_delta     = +qty
from_location = null
to_location   = "STAGING-{shipmentId}"
reference_type = "receiving_session"
```

### Putaway (at task confirm)
```
movement_type = "putaway"
qty_delta     = 0          ← location-only, no balance change
from_location = "STAGING-{shipmentId}"
to_location   = "R-01-A-2-3"
reference_type = "task"
```

## Destination suggestion logic

When putaway tasks are generated:

1. **Pallet pre-assignment** — if `inbound_pallets.assigned_location_code` is
   set for the shipment, the first non-null value is used as the default
   destination for all tasks in that shipment.
2. **Null** — if no pre-assignment exists, destination is left null and the
   operator must choose before confirming.

More sophisticated per-SKU slotting (preferred rack by client, fragmentation
avoidance, capacity check) is deferred to a future phase.

## Important edge cases

### Existing SKUs receiving more stock
If a SKU is already in a rack (e.g. `R-02-A-1-1`) and more units arrive,
the receive movement records `to_location = STAGING-{shipmentId}` but
`inventory_items.location` stays `R-02-A-1-1`. After putaway is confirmed,
`location` will be overwritten with the destination of the putaway task.

For Phase 9, this is acceptable — the location field reflects the most
recently confirmed putaway for that SKU. Multi-location inventory tracking
per SKU is a future concern.

### Putaway without prior receiving session
Tasks can only be generated from **completed** receiving sessions with posted
scans. If no completed session exists, `POST /api/inbound/{id}/putaway`
returns 422.

### Re-generating tasks
Calling generate again after tasks already exist returns the existing task
IDs with `created: 0, skipped: N`. Use the "Re-generate from latest session"
button if a new session was completed with additional scans — this is
currently a no-op for already-generated sessions (idempotency guard).
Future improvement: detect session changes and create delta tasks.
