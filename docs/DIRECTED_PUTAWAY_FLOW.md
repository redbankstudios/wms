# Directed Putaway Flow — Phase 9

## Overview

Phase 9 introduces a clean receiving → staging → storage workflow.
Before this phase, scanned inventory was immediately available with no
intermediate staging state and no verified location move. After this phase,
the lifecycle is:

```
Truck arrives → Receiving session → Scans posted → Session finalized
    → Putaway tasks generated → Operator assigns destination → Putaway confirmed
    → Inventory at final rack/bin location
```

---

## Step-by-step Flow

### 1. Receiving session opened
An operator opens a receiving session for an inbound shipment via
`POST /api/receiving/sessions`. This session is tied to the shipment.

### 2. Items scanned and posted to ledger
Each scan records a `receive` movement in the ledger. Starting with Phase 9,
every `receive` movement carries:
- `to_location = STAGING-{shipmentId}` (e.g. `STAGING-SHIP-20260310-001`)

This is informational only — it records where inventory physically landed in
the movement audit trail. `inventory_items.location` is **not** updated at
scan time.

### 3. Session finalized
`PATCH /api/receiving/sessions/{id}` with `action: "finalize"` closes the
session, checks shortages, raises exceptions, and returns a summary.

### 4. Putaway tasks generated
`POST /api/inbound/{shipmentId}/putaway` (or through the Inbound slide-over
→ Putaway tab → Generate button) creates one `Putaway` task per distinct
`inventory_item_id` found in the session's posted scans.

Each task carries:
- `type = "Putaway"`
- `status = "pending"`
- `source_location = STAGING-{shipmentId}`
- `destination_location` = suggested from pallet pre-assignment, or null
- `qty` = total units received for that item in this session
- `inbound_shipment_id`, `receiving_session_id`, `inventory_item_id`, `sku`

Generation is idempotent: calling it twice returns the same task IDs.

### 5. Destination selected (if not pre-assigned)
If `destination_location` is null, the operator selects a rack/bin code in
the Putaway tab of the Inbound slide-over before confirming.

Storage location codes are loaded from `storage_locations.code` and shown
as a dropdown. If no location data is available, a free-text input is used.

### 6. Putaway confirmed
`POST /api/tasks/{taskId}/putaway` with `{ tenantId, destinationLocation }`:

1. Task validated: type=Putaway, status≠completed
2. `putaway` movement written to `inventory_movements`:
   - `qty_delta = 0` (location-only, no balance change)
   - `from_location = source (STAGING-{shipmentId})`
   - `to_location = destinationLocation`
   - `reference_id = taskId`, `reference_type = "task"`
3. `inventory_items.location` updated to `destinationLocation`
4. Task marked `completed` with `completed_at` and `completed_by_user_id`
5. Audit event `task.putaway.confirm` logged

### 7. Inventory visible at final location
The Inventory screen reads `inventory_items.location` directly. After
putaway is confirmed, the item appears at the rack/bin code, not staging.

---

## What the Staging Location Means

`STAGING-{shipmentId}` is a **text convention**, not a record in any table.
It exists only as:
- `to_location` on `receive` movements (audit trail)
- `source_location` / `location` on Putaway tasks (work queue)
- `from_location` on `putaway` movements (audit trail)

No migration to `storage_locations` or `warehouse_zones` is required.
The dock door is available from `inbound_shipments.dock_door` for reference.

---

## What Is Still Deferred

| Capability | Status |
|---|---|
| Scan-to-location (physical barcode confirm at destination) | Deferred |
| Wave putaway (batching tasks by zone/route) | Deferred |
| Slot optimization / AI slotting | Deferred |
| Per-SKU destination suggestion (beyond first pallet pre-assignment) | Deferred |
| Staging zone as a real `warehouse_zones` record | Deferred |
| RLS enforcement | Deferred |
| Mobile putaway UI (dedicated scanner page) | Deferred |
| Putaway task → advance shipment status to "putaway" automatically | Deferred |
