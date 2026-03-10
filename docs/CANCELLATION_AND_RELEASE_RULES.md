# Cancellation and Release Rules — Phase 7

## Two distinct operations

| Operation | Endpoint | Purpose |
|-----------|----------|---------|
| **Release** | `POST /api/orders/[id]/release` | Voluntary un-allocation. Returns order to `pending` so it can be re-allocated. |
| **Cancel & Release** | `POST /api/orders/[id]/cancel` | Abort the order entirely. Frees inventory and marks order `cancelled`. |

---

## Release (`/release`)

- Allowed source statuses: `allocated`, `picking`
- Writes `unreserve` movements for all active/partially_picked reservations.
- Reservation status → `released`.
- Order status → `pending`.
- The order can then be re-allocated with different quantities or items.

Release does NOT handle packed orders — once packed, use Cancel instead.

---

## Cancel (`/cancel`)

### Allowed source statuses
`pending`, `allocated`, `picking`, `processing`, `packed`

### Blocked source statuses
`shipped`, `in_transit`, `delivered`, `cancelled`, `returned`

Once an order is shipped, inventory has left the warehouse. Reversals require
a separate returns workflow (not in scope for Phase 7).

---

## Cancellation behaviour by stage

### Stage 1 — Pre-allocation (`pending`)

Order has no reservations. Cancel simply sets `order.status = cancelled`.
No inventory movements written. Any associated shipment record is marked
`cancelled` (edge case: unlikely to exist at this stage).

### Stage 2 — Allocated, no picks (`allocated`)

All reservations are in status `active`.

For each reservation:
- `unreserve` movement written for `reserved_qty`.
- Reservation status → `cancelled`.
- `available` balance restored (on_hand unchanged, reserved decremented).

### Stage 3 — Partially picked (`picking` with some picks done)

Reservations are a mix of `active`, `partially_picked`, and possibly `fulfilled`.

For `active` and `partially_picked` reservations:
- `unreserve` movement written for `reserved_qty − picked_qty` only.
- Reservation status → `cancelled`.
- Already-picked stock is **NOT reversed** — it has already left on_hand and
  is physically staged/packed somewhere in the warehouse.

For `fulfilled` reservations (fully picked):
- No unreserve movement written (reserved = 0 already).
- Reservation record left as `fulfilled` — cancelling the order does not
  change the accounting for stock that was already picked.

### Stage 4 — Packed, not shipped (`packed`)

Identical to Stage 3. The pick state of each reservation determines whether
an unreserve movement is written. The `shipments` record (if present from
pack_confirmed) is marked `cancelled`.

**Important:** packed-but-not-shipped means stock may be physically in a
staging area. The cancellation does not automatically return it to a storage
location. A separate putaway or adjustment task should be created manually.
This is a known operational gap — deferred for now.

---

## Inventory balance impact matrix

| Stage at cancel    | unreserve written? | on_hand changed? | reserved changed? |
|--------------------|-------------------|------------------|-------------------|
| pending            | No                | No               | No                |
| allocated          | Yes (full qty)    | No               | −full qty         |
| picking (partial)  | Yes (unpicked qty)| No               | −unpicked qty     |
| packed             | Yes (unpicked qty)| No               | −unpicked qty     |

---

## Reservation status after cancel

| Previous status     | After cancel      | Notes                          |
|---------------------|-------------------|--------------------------------|
| `active`            | `cancelled`       | Full unreserve written         |
| `partially_picked`  | `cancelled`       | Partial unreserve written      |
| `fulfilled`         | `fulfilled`       | Not touched — pick is sunk     |
| `released`          | `released`        | Already released — not touched |

---

## Shipment record after cancel

If a `shipments` row exists (created during pack confirmation):
- `shipment_status → cancelled`
- `status → cancelled`

If no shipment row exists, nothing is created.

---

## What is still deferred

- Automatic putaway task creation for packed-but-cancelled stock in staging.
- Reverse-pick movement to explicitly return picked-but-not-shipped stock.
- Cancellation notifications to clients or drivers.
- Partial-order cancellation (cancel one line without cancelling the whole order).
