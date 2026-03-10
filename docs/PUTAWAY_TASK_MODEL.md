# Putaway Task Model — Phase 9

## Storage

Putaway work is stored in the existing `tasks` table. No separate table was added.
Phase 9 extends `tasks` with execution-specific columns added in migration
`20260310000001_add_putaway_execution_fields.sql`.

## New columns on `tasks`

| Column | Type | Description |
|---|---|---|
| `inbound_shipment_id` | text | FK to `inbound_shipments.id` |
| `receiving_session_id` | text | FK to `receiving_sessions.id` |
| `inventory_item_id` | text | FK to `inventory_items.id` |
| `sku` | text | Human-readable SKU (denormalized for display) |
| `source_location` | text | Dock/staging code where inventory landed |
| `destination_location` | text | Rack/bin code for final storage (nullable) |
| `qty` | integer | Units to be moved |
| `completed_at` | timestamptz | When putaway was confirmed |
| `completed_by_user_id` | text | WMS user who confirmed |

## Task lifecycle

```
pending → (in_progress optional) → completed
```

A task transitions to `completed` only through `POST /api/tasks/{id}/putaway`.
Direct status patches via the general tasks API do not write ledger movements —
always use the putaway-specific route for Putaway task completion.

## Generation logic

`generatePutawayTasks(db, tenantId, sessionId, shipmentId)` in
`lib/inventory/putawayService.ts`:

1. Checks idempotency: returns existing task IDs if any Putaway tasks with
   `receiving_session_id = sessionId` already exist.
2. Queries `receiving_scans` for `outcome = 'posted'` and `session_id = sessionId`.
3. Groups by `inventory_item_id`, summing `resolved_base_qty`.
4. Reads `inbound_pallets.assigned_location_code` for the shipment to find a
   destination suggestion (first non-null value used as a default for all tasks).
5. Inserts one task row per group with `source_location = STAGING-{shipmentId}`.

## Confirmation logic

`confirmPutawayTask(db, tenantId, taskId, destinationLocation, actorId)`:

1. Loads task, verifies `type = 'Putaway'` and `status ≠ 'completed'`.
2. Calls `createInventoryMovement` with `movementType = 'putaway'`:
   - `qty_delta = 0` — balances unchanged
   - `from_location = source_location`
   - `to_location = destinationLocation`
3. Updates `inventory_items.location = destinationLocation`.
4. Updates task: `status = 'completed'`, `destination_location`, `completed_at`,
   `completed_by_user_id`.

## Service file

`lib/inventory/putawayService.ts` exports:

| Function | Purpose |
|---|---|
| `buildStagingLocation(shipmentId)` | Returns `STAGING-{shipmentId}` |
| `generatePutawayTasks(...)` | Create tasks from session scans |
| `confirmPutawayTask(...)` | Confirm move, write ledger, update location |
| `getPutawayTasksForShipment(...)` | Query all Putaway tasks for a shipment |
| `getPutawayStatusForShipment(...)` | Aggregate progress counts |
| `findLatestCompletedSession(...)` | Find the most recent completed session |

## API routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/inbound/{shipmentId}/putaway` | Get putaway status + tasks |
| POST | `/api/inbound/{shipmentId}/putaway` | Generate tasks (finds session internally) |
| POST | `/api/tasks/{taskId}/putaway` | Confirm one task |
