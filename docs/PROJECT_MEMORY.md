# Project Memory: WMS & Delivery (Discovery Snapshot)

## Scope of this pass
Read-only architectural discovery across frontend, data access layer, Supabase schema/migrations, and operational flows.

## Platform identity
- App type: single Next.js 15 web app (React 19, TypeScript, Tailwind).
- Pattern: client-rendered operational console with role/tenant switching in UI.
- Runtime data backend: Supabase PostgREST (`/rest/v1/*`) called directly from browser.
- Provider mode: `NEXT_PUBLIC_DATA_PROVIDER=supabase` (fallback `mock` provider exists).

## Core architectural facts
- No internal backend API routes (`app/api` absent).
- No server-side domain service layer in Next.js app.
- Data contract centralized in [`data/providers/IDataProvider.ts`](../data/providers/IDataProvider.ts).
- Primary implementation in [`data/providers/supabase/index.ts`](../data/providers/supabase/index.ts).
- Supabase REST helper in [`lib/supabaseRest.ts`](../lib/supabaseRest.ts) uses anon key in client requests.

## Data model themes
- Tenant-scoped entities use `tenant_id` columns broadly.
- Warehouse model exists at `warehouse_zones -> racks -> storage_locations`.
- Inbound model exists at `inbound_shipments -> inbound_pallets -> inbound_boxes -> inbound_box_items`.
- Inventory is snapshot-based (`inventory_items`) with no immutable stock movement ledger.
- Products support one optional barcode (`products.barcode`), no barcode alias table.
- Tasks are generic work records and are used to represent receiving/putaway/pick/pack/return work.

## Fulfillment and receiving posture
- Order lifecycle status exists (`pending -> allocated -> picking -> packed -> shipped -> delivered`).
- Dispatch queue can auto-assign drivers and mark orders shipped.
- Driver mobile flow can mark route stops complete and set linked orders delivered.
- Inbound screen supports shipment browsing and task creation for receive/putaway.
- Receiving confirmation currently updates inbound status in local UI state only (not persisted).

## Security and tenancy posture (critical)
- UI role gating exists via `selectedRole` and `NAV_ITEMS` only.
- No app-level authentication middleware/session enforcement found.
- Supabase Auth is enabled in config, but app does not integrate Supabase Auth SDK for login/session.
- Migrations explicitly disable RLS on all core tables.
- Tenant isolation is implemented mainly by client-side query filters (`tenant_id=eq.*`) and context selection.

## Persisted vs simulated behavior
Persisted examples:
- CRUD for inventory/tasks/users/drivers/zones/racks/warehouse zones.
- Route stop creation and updates.
- Order status updates.
- Driver message replies/read markers.
- Inbound shipment create.

Simulated or partially simulated examples:
- Mobile worker barcode scan and task completion flow.
- B2B outbound “auto-sync to inbound” message (UI-only).
- Some dispatcher actions (UI state updates without persistent route-state updates).
- Tenant suspend/activate in tenant screen (local state only).

## Integrations found
- Mapbox: geocoding + map rendering.
- Supabase: Postgres + PostgREST as primary data API.
- Vercel Analytics / Speed Insights.
- Shopify/QuickBooks/Samsara shown as integration UI placeholders in Settings and marketing/pricing copy.

## High-confidence blockers for Smart Receiving
- No universal barcode model (single barcode field only).
- No pack/case/UOM conversion schema in transactional product/inventory core.
- No unknown barcode learning workflow/table.
- No receiving execution journal (scan-by-scan or movement-by-movement event store).
- Weak tenant/auth enforcement (RLS disabled + no app auth enforcement).

## UNKNOWN areas
- UNKNOWN: remote Supabase environment may have policies not represented in local migrations.
- UNKNOWN: external systems may write directly to `events`/inbound tables outside this repository.
- UNKNOWN: intended production auth strategy beyond current demo role selector.
