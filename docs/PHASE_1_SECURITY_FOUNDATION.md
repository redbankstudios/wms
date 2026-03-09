# Phase 1 + 1.5 Security Foundation — Implementation Summary

**Phase 1 date:** 2026-03-08
**Phase 1.5 date:** 2026-03-08
**Status:** Phase 1.5 COMPLETE — mutation boundary fully closed, docs reconciled, audit logging wired

---

## True Current State (as of Phase 1.5)

### What is applied to the live remote DB
- Migration `20260308000001` — `users.supabase_auth_id uuid` column + index ✅ APPLIED
- Migration `20260308000003` — `route_stops.tenant_id` column (backfilled from routes) ✅ APPLIED
- Migration `20260308000002` — RLS policies + `public.current_user_tenant_id()` + `public.current_user_role()` ❌ **NOT APPLIED**

### RLS status
**RLS is currently DISABLED on all tables.** Reads return full data via the anon key (no session required). This is intentional for the current development phase.

The migration file `20260308000002_rls_phase1_core_tables.sql` is staged and ready but has a prominent "DO NOT APPLY" banner. It must not be applied until:
1. `users.supabase_auth_id` is backfilled for all active users
2. All browser reads are moved to session-aware server-side paths (or a read proxy using the service role key is in place)
3. Login flow is tested end-to-end

### Write path (mutations)
All mutations go through trusted API route handlers that enforce: **auth → tenant → role → admin client write**.
- In production: unauthenticated mutation requests return 401.
- In development (NODE_ENV=development): `resolveAuth()` falls back to dev-bypass mode if no session exists (console warning only), preserving the demo shell UX.

---

## A. Completed — Phase 1

### Auth infrastructure
- `lib/supabase/client.ts` — browser Supabase client (anon key, reads-only path)
- `lib/supabase/server.ts` — `createClient()` (session-aware) + `createAdminClient()` (service role, post-auth only)
- `lib/supabase/middleware.ts` — session cookie refresh
- `middleware.ts` — session refresh + production redirect guard (active in prod or when `NEXT_PUBLIC_FORCE_AUTH_REDIRECT=true`)

### AuthZ primitive layer (`lib/authz/index.ts`)
- `requireAuthenticatedUser()` — verifies JWT, resolves AppUser from `users` table via `supabase_auth_id`
- `requireTenantAccess(user, tenantId)` — cross-tenant block; platform_owner exempt
- `requireRole(user, roles)` — role gate; platform_owner passes always
- `resolveAuth(tenantId)` — dev-mode aware resolver
- `logAuditEvent(db, tenantId, actorId, eventType, entityId, metadata?)` — lightweight audit insert into `events` table
- `AuthError`, `requireString`, `requireOneOf`, `withAuth`

### API mutation client
`lib/api/client.ts` — `apiMutate(path, method, body)` sends mutations to API routes with session cookies.

### Backend mutation routes (all use resolveAuth + admin client)

| Route | Methods | Audit logged |
|-------|---------|-------------|
| `/api/inventory` | POST, PATCH, DELETE | ✅ inventory.create / inventory.update / inventory.delete |
| `/api/tasks` | POST | — |
| `/api/tasks/[id]` | PATCH, DELETE | ✅ task.update / task.delete |
| `/api/orders` | POST | — |
| `/api/orders/[id]` | PATCH | ✅ order.update |
| `/api/routes/stops` | POST | — |
| `/api/routes/stops/[id]` | PATCH | ✅ route_stop.update |
| `/api/inbound` | POST, PATCH | — |
| `/api/returns/[id]` | PATCH | ✅ return.update |

### Data provider — fully wired for mutations (Phase 1.5 complete)
All 8 previously-direct mutations now route through the API boundary:

| Method | Was | Now |
|--------|-----|-----|
| `updateOrderStatus` | `supabasePatch` | `/api/orders/[id] PATCH` |
| `updateInventoryItem` | `supabasePatch` | `/api/inventory PATCH` |
| `deleteInventoryItem` | `supabaseDelete` | `/api/inventory DELETE` |
| `updateTaskStatus` | `supabasePatch` | `/api/tasks/[id] PATCH` |
| `updateTask` | `supabasePatch` | `/api/tasks/[id] PATCH` |
| `deleteTask` | `supabaseDelete` | `/api/tasks/[id] DELETE` |
| `updateRouteStop` | `supabasePatch` | `/api/routes/stops/[id] PATCH` |
| `updateReturnDisposition` | `supabasePatch` | `/api/returns/[id] PATCH` |

Interface signatures updated in `IDataProvider.ts` — all 8 now require `tenantId` as the last parameter.

### Auth UX
- `app/login/page.tsx` — Supabase email/password login
- `context/AuthContext.tsx` — `authUser`, `authLoading`, `signOut` wired into `app/layout.tsx`

---

## B. Files Changed (Phase 1.5 additions)

**Modified:**
`data/providers/IDataProvider.ts`, `data/providers/supabase/index.ts`, `data/providers/mock/index.ts`,
`middleware.ts`, `lib/authz/index.ts`,
`app/api/inventory/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/orders/[id]/route.ts`,
`app/api/routes/stops/[id]/route.ts`, `app/api/returns/[id]/route.ts`,
`components/screens/orders.tsx`, `components/screens/dispatch-queue.tsx`,
`components/screens/mobile-driver.tsx`, `components/screens/returns.tsx`,
`components/screens/tasks.tsx`, `components/screens/employees.tsx`,
`components/screens/inventory.tsx`

**New:**
`scripts/backfill-auth-ids.sql`, `docs/PHASE_1_SECURITY_FOUNDATION.md` (this file),
`docs/RLS_ROLLOUT_PLAN.md`, `docs/AUTH_AND_AUTHZ_MODEL.md`

**API route bug fixes:**
- `app/api/routes/stops/[id]/route.ts` — stop statuses corrected to match `RouteStop.status` type: `["pending", "next", "completed", "issue"]`
- `app/api/returns/[id]/route.ts` — return statuses corrected to match `Return.status` type: added `"completed"`

---

## C. RLS — Current State

**RLS is DISABLED on all 21 tables that have policies written for them.**

The SQL policies exist in `supabase/migrations/20260308000002_rls_phase1_core_tables.sql` but the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements have not been executed.

**Reads**: use the anon key directly via `supabaseRest.ts`. With RLS disabled, all rows return. This is intentional during dev.

**Writes**: all go through API routes using the service-role admin client, which bypasses RLS. The auth layer before the admin client is what provides isolation.

### Tables that will have RLS when migration 2 is applied (21 total)
orders, order_lines, inventory_items, tasks, routes, route_stops, returns, drivers, vehicles, delivery_zones, driver_messages, warehouse_zones, racks, storage_locations, inbound_shipments, notifications, events, clients, products, users, tenants

### Tables deferred (no RLS written yet)
`inbound_pallets`, `inbound_boxes`, `inbound_box_items` — no `tenant_id` column
`invoices`, `payments` — billing logic review needed
`shipments` — may cross tenant boundaries
`locations`, `route_exceptions` — no `tenant_id` column
`tenant_storage_summaries`, `putaway_suggestions` — computed/denormalized, enforce via base tables
`return_lines` — no `tenant_id`, parent `returns` protected

---

## D. Remaining Risks

1. **RLS not enabled** — anon key reads return all rows regardless of tenant. This is the intended state until prerequistes are met. Do not enable migration 2 until reads are on authenticated paths.

2. **`SUPABASE_SERVICE_ROLE_KEY` must be set** — `createAdminClient()` will throw without it. Confirm it is set in `.env.local` and Vercel env vars before trusting any API route mutation behavior.

3. **`users.supabase_auth_id` is not backfilled** — column exists, no rows filled. Use `scripts/backfill-auth-ids.sql` to link auth identities. Until this is done, `requireAuthenticatedUser()` returns 403 for every login.

4. **DemoContext role/tenant switching is not auth-derived** — still uses client-supplied state. Acceptable for dev. Must be replaced before production.

5. **Dev bypass in prod** — `resolveAuth()` checks `NODE_ENV`. Confirm `NODE_ENV=production` is set on Vercel production deployments.

---

## E. Phase 2 Next Steps (in priority order)

1. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel
2. Create Supabase Auth test accounts; run `scripts/backfill-auth-ids.sql`
3. Test login at `/login` — verify `AuthContext.authUser` populates, mutations work authenticated
4. Move browser reads to server-side paths (RSC or API route read proxies) — prerequisite for enabling RLS
5. Apply migration `20260308000002` table by table per `docs/RLS_ROLLOUT_PLAN.md`
6. Add `tenant_id` to `inbound_pallets/boxes/box_items`, write and apply their RLS
7. Replace DemoContext role/tenant with auth-derived values
