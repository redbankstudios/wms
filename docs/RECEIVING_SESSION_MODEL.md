# Receiving Session Model

**Phase:** 4
**Status:** IMPLEMENTED

---

## Session Lifecycle

```
                    ┌─────────────┐
                    │   (none)    │
                    └──────┬──────┘
                           │ POST /api/receiving/sessions
                           ▼
                    ┌─────────────┐
              ┌────►│    open     │◄────┐
              │     └──────┬──────┘     │
              │            │            │
              │         scan / post     │ PATCH action="pause" → resume not yet implemented
              │            │            │ (reopen: just POST sessions again — returns same session)
              │            ▼            │
              │     ┌─────────────┐     │
              │     │   paused    │─────┘
              │     └─────────────┘
              │
              │ PATCH action="finalize"
              │            │
              │            ▼
              │     ┌─────────────┐
              │     │  completed  │  (terminal — no further scans accepted)
              │     └─────────────┘
              │
              │ PATCH action="cancel"
              │            │
              │            ▼
              │     ┌─────────────┐
              └────►│  cancelled  │  (terminal)
                    └─────────────┘
```

---

## Idempotency

`openReceivingSession` checks for an existing `open` session for the same
`(tenant_id, inbound_shipment_id)` before creating a new one. If one exists,
it returns the existing `sessionId`. This makes the UI safe to call "Start
Receiving" multiple times (e.g. after a page refresh).

---

## Tables

### `receiving_sessions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | `SES-{timestamp}-{rand}` |
| `tenant_id` | text FK | Multi-tenant isolation |
| `inbound_shipment_id` | text FK | The shipment being received |
| `operator_user_id` | text | WMS user who opened the session (nullable in dev) |
| `status` | text | `open` / `paused` / `completed` / `cancelled` |
| `started_at` | timestamptz | Set on INSERT (DEFAULT now()) |
| `closed_at` | timestamptz | Set when completed or cancelled |
| `notes` | text | Optional operator notes |

### `receiving_scans`

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | `SCN-{timestamp}-{rand}` |
| `tenant_id` | text FK | |
| `session_id` | text FK → receiving_sessions | |
| `inbound_shipment_id` | text FK | Denormalized for fast queries |
| `barcode` | text | Raw scan string (null for manual SKU entry) |
| `sku` | text | Resolved SKU |
| `product_id` | text | Resolved product ID (null if unknown barcode) |
| `inventory_item_id` | text | Inventory item to receive into (null if not yet created) |
| `uom` | text | `each` / `case` / `pallet` etc. |
| `scanned_qty` | integer | Units of `uom` scanned |
| `resolved_base_qty` | integer | Base units = scanned_qty × quantityMultiplier |
| `movement_id` | text | Set after `postReceivingScanToLedger` |
| `outcome` | text | `matched` / `unmatched` / `exception` / `posted` |
| `exception_code` | text | Set when outcome = exception |
| `metadata` | jsonb | Spare bag |

---

## Scan Outcome Rules

| Condition | Outcome |
|-----------|---------|
| Barcode found, SKU in manifest, qty ≤ expected | `matched` |
| Barcode found, SKU not in manifest | `exception` (sku_mismatch) |
| Barcode found, qty > expected | `exception` (overage) |
| Barcode not found | `exception` (unknown_barcode) |
| No barcode (SKU entry), SKU in manifest | `matched` |
| No barcode (SKU entry), SKU not in manifest | `exception` (sku_mismatch) |
| After ledger post | `posted` |

---

## Expected Quantity Source

Expected quantities come from `inbound_box_items.quantity` summed per SKU
across all boxes in all pallets of the shipment:

```
inbound_shipments → inbound_pallets → inbound_boxes → inbound_box_items
```

If a SKU appears across multiple boxes, quantities are summed.
