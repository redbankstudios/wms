# Scan / Warehouse Event Tracking Discovery

## 1) Persisted event-oriented tables

## `events` (generic event ingestion)
- Schema: `id`, `tenant_id`, `source`, `event_type`, `payload jsonb`, `received_at`.
- Accessors:
  - `events.getEventsByTenant(tenantId)`
  - `events.getEventsByType(tenantId, eventType)`
- Seed examples include `shopify` and `internal` event types (`orders/create`, `task.completed`, `inventory.low_stock`).

## `driver_messages` (operational comms thread)
- Tracks dispatcher/driver message timeline with `status` and optional parent thread.
- Not a scanner event table, but it stores operational incidents (including scanner issue text in seeded data).

## `route_exceptions` (delivery issue records)
- Stores route-level exceptions (issue, customer, stop, status).
- Used as exception feed for dispatcher/dashboard flows.

## `notifications` (UI/system alert feed)
- Read status and created timestamps exist.
- Used for notification-style UX, not a structured warehouse scan audit trail.

## 2) Non-persisted event/log behaviors
- Task and employee screens maintain local session banners/logs in React state (`sessionLog`).
- These logs are not written to database.
- Mobile scan interactions are UI-state transitions only (no persisted scan events).

## 3) Scan-event coverage assessment

### What exists
- Generic `events` table can technically hold scan-like events in `payload`.

### What does not exist
- No dedicated `scan_events` table.
- No normalized fields for:
  - scanned barcode
  - scanner device/user/session
  - confidence/symbology
  - expected vs actual SKU comparison
  - receiving transaction linkage

## 4) Event flow in current implementation
- Most operational state changes happen as direct row updates in domain tables:
  - e.g., `orders.status`, `tasks.status`, `route_stops.status`, `inventory_items.qty`.
- These updates do not automatically emit immutable audit rows in this codebase.

## 5) Observed gaps for auditability
- No full movement/event journal for inventory changes.
- No immutable record of scan attempts/failures/overrides.
- No cross-entity event correlation keys (e.g., receiving session -> scan -> inventory mutation -> task completion).

## UNKNOWN
- UNKNOWN: whether external producers (outside this repository) write additional events into `events` in production.
- UNKNOWN: whether database triggers exist remotely to build audit trails not represented in migrations.
