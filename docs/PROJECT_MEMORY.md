# Project Memory

## System summary
This repository is a Next.js App Router application for a multi-tenant Warehouse Management System (WMS) plus last-mile delivery operations. The UI runs mostly as a single in-app shell (`app/page.tsx`) with role-gated modules (inventory, inbound, tasks, orders, dispatch, driver, returns, billing, reports), while data access is abstracted behind a provider interface that can point to Supabase REST (`NEXT_PUBLIC_DATA_PROVIDER=supabase`) or in-memory/mock services.

## Tech stack
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Radix UI, Recharts.
- Backend access: Supabase PostgREST via custom fetch wrappers (`lib/supabaseRest.ts`).
- Database: Supabase Postgres (`public` schema; SQL migrations in `supabase/migrations`).
- Auth/session: `UNKNOWN` for app-level auth enforcement. Supabase auth is enabled in `supabase/config.toml`, but app shell currently uses `DemoContext` role switching.
- Maps: Mapbox (`mapbox-gl`, `react-map-gl`) in dispatch/driver/map screens.
- Hosting/deployment: Next standalone output (`next.config.ts`). Vercel config file not found (`UNKNOWN` actual hosting config).

## Runtime environments
- Local:
  - Next app (`npm run dev`), Supabase local stack configured in `supabase/config.toml`.
  - Data source selected by `NEXT_PUBLIC_DATA_PROVIDER` (`data/index.ts`).
- Production:
  - Requires public Supabase URL/key and Mapbox token.
  - `eslint.ignoreDuringBuilds: true` in `next.config.ts` means lint does not block production build.

## Key domains/entities
- Tenant: `public.tenants`
- Order + lines: `public.orders`, `public.order_lines`
- Inventory: `public.inventory_items`
- Tasks: `public.tasks`
- Routing: `public.routes`, `public.route_stops`, `public.route_exceptions`
- Drivers/Zones: `public.drivers`, `public.delivery_zones`
- Vehicles: `public.vehicles`
- Returns: `public.returns`, `public.return_lines`
- Inbound receiving: `public.inbound_shipments`, `public.inbound_pallets`, `public.inbound_boxes`, `public.inbound_box_items`
- Storage topology: `public.warehouse_zones`, `public.racks`, `public.storage_locations`, `public.tenant_storage_summaries`, `public.putaway_suggestions`
- Billing/events/comms: `public.invoices`, `public.payments`, `public.events`, `public.notifications`, `public.driver_messages`
- Master data: `public.clients`, `public.products`, `public.locations`, `public.users`, `public.shipments`

## Core user roles and permissions
Defined in `config/roleNavigation.ts` and enforced in UI in `app/page.tsx`.
- Roles: `platform_owner`, `business_owner`, `warehouse_manager`, `shipping_manager`, `warehouse_employee`, `packer`, `driver`, `driver_dispatcher`, `b2b_client`, `end_customer`.
- Enforcement method today: client-side role check against `NAV_ITEMS` before rendering tab content.
- Server-side/DB policy enforcement: `UNKNOWN` in app code; SQL migrations currently disable RLS on all created tables.

## Critical workflows
- Receiving/inbound:
  - Screen: `components/screens/inbound.tsx`
  - Data: inbound shipments/pallets/boxes/items + storage zones/racks + clients
  - Mutation: creates inbound record and creates follow-up tasks.
- Putaway/storage:
  - Screens: `components/screens/storage.tsx`, `components/screens/settings.tsx`
  - Data: zones/racks/locations/summaries/suggestions
  - Mutation: zone/rack CRUD in settings.
- Picking/packing/tasks:
  - Screen: `components/screens/tasks.tsx`
  - Data: tasks + users
  - Mutation: create/edit/assign/status/delete task.
- Order lifecycle:
  - Screen: `components/screens/orders.tsx`
  - Data: orders + order lines + clients + shipments
  - Mutation: create order, update order status.
- Dispatch & route assignment:
  - Screen: `components/screens/dispatch-queue.tsx`
  - Data: orders/drivers/vehicles/zones/routes/stops
  - Mutation: create route stops, update order status to packed/shipped.
- Driver execution + POD:
  - Screen: `components/screens/mobile-driver.tsx`
  - Data: routes + stops
  - Mutation: update route stop status; updates linked order to delivered when `orderId` exists.
- Returns:
  - Screen: `components/screens/returns.tsx`
  - Data: returns + return lines
  - Mutation: update disposition/status.

## Important directories
- `app/`: Next routes (`/` shell app and `/pricing` marketing page).
- `components/screens/`: business modules rendered by tab id.
- `components/layout/`: sidebar/topbar navigation and global search.
- `data/providers/`: provider abstraction (`mock` and `supabase`).
- `lib/`: REST client (`supabaseRest.ts`) and helpers (`autoAssign.ts`).
- `services/`: mock/in-memory service implementations.
- `context/`: app-wide state providers (`DemoContext`, theme, messages).
- `config/`: role-based nav definitions.
- `supabase/migrations/`: SQL schema + seed/evolution scripts.
- `mock/`: static demo data used by mock provider/services.

## Top 10 "where to change X" pointers
1. Navigation tabs and role access: `config/roleNavigation.ts`.
2. Tab-to-screen rendering logic: `app/page.tsx` (`renderContent` switch).
3. Global header search behavior/indexing: `components/layout/topbar.tsx`.
4. Provider selection (Supabase vs mock): `data/index.ts`.
5. Supabase table/API mapping and CRUD calls: `data/providers/supabase/index.ts`.
6. Low-level Supabase REST request behavior/headers/errors: `lib/supabaseRest.ts`.
7. Pricing page plans/calculator/recommendations: `app/pricing/page.tsx`.
8. Dispatch assignment logic + route stop creation: `components/screens/dispatch-queue.tsx` and `lib/autoAssign.ts`.
9. Driver delivery completion behavior (route stop + order delivered): `components/screens/mobile-driver.tsx`.
10. Database schema/tenant columns/indexes/RLS state: `supabase/migrations/*.sql`.
