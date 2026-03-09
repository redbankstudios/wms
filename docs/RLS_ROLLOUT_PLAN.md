# RLS Rollout Plan

## Current Status: STAGED — NOT APPLIED (rolled back 2026-03-09)

Migration file: `supabase/migrations/20260308000002_rls_phase1_core_tables.sql`

**RLS is currently DISABLED on all tables.** Migration `20260308000002` was applied prematurely at some point, causing all 17 core tables to return empty data via the anon key. It was rolled back on 2026-03-09 using `scripts/disable-rls-emergency-rollback.sql`.

This is intentional. The migration banner reads "DO NOT APPLY UNTIL Phase 1.5 prerequisites are met." Those prerequisites are not yet fully satisfied.

---

## What Has Been Applied

| Migration | Status | What it does |
|-----------|--------|-------------|
| `20260308000001_add_supabase_auth_id_to_users.sql` | APPLIED | Adds `users.supabase_auth_id uuid` column + index |
| `20260308000002_rls_phase1_core_tables.sql` | NOT APPLIED | Creates RLS helper functions + policies for 21 tables — policies written but RLS is NOT enabled |
| `20260308000003_add_tenant_id_to_route_stops.sql` | APPLIED | Adds `route_stops.tenant_id`, backfills from parent routes, adds FK + index |

---

## Prerequisites Before Applying Migration 2

All of the following must be true before running `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is configured in server environment
- [ ] `users.supabase_auth_id` is backfilled for all active users (`scripts/backfill-auth-ids.sql`)
- [ ] At least one Supabase Auth account exists and login tested end-to-end
- [ ] All browser reads are moved to session-aware server-side paths (server components or `/api/read/` proxies using `createClient()` with session, or `createAdminClient()`)
  - Currently reads use the anon key via `lib/supabaseRest.ts` — these return empty with RLS enabled and no session
- [ ] Test suite passes with RLS enabled on a staging Supabase project

---

## Why Reads Break Without Session

When RLS is enabled, PostgREST evaluates `auth.uid()` for every request. The anon key used in `lib/supabaseRest.ts` has no JWT user claims, so:
- `public.current_user_tenant_id()` returns null
- Every SELECT policy `tenant_id = current_user_tenant_id()` filters all rows
- Tables appear empty in the UI

The fix is one of:
1. **Move reads to server components** using `createClient()` (session-aware — user must be logged in)
2. **Add read API routes** using `createAdminClient()` — bypasses RLS, server-side auth enforced before read
3. **Keep RLS disabled** until option 1 or 2 is complete (current state)

---

## Safe Activation Order

Apply table by table, testing after each step. Start with lower-risk tables.

### Batch 1 — Operational/delivery data
```sql
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.delivery_zones enable row level security;
```

### Batch 2 — Business-critical data
```sql
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.tasks enable row level security;
alter table public.returns enable row level security;
alter table public.driver_messages enable row level security;
```

### Batch 3 — Inventory and warehouse
```sql
alter table public.inventory_items enable row level security;
alter table public.warehouse_zones enable row level security;
alter table public.racks enable row level security;
alter table public.storage_locations enable row level security;
```

### Batch 4 — Reference data
```sql
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.notifications enable row level security;
alter table public.events enable row level security;
alter table public.inbound_shipments enable row level security;
```

### Batch 5 — Identity tables (highest risk, apply last)
```sql
alter table public.tenants enable row level security;
alter table public.users enable row level security;
```

---

## How to Test Each Batch

1. Apply RLS on a **staging Supabase project** (clone of production schema)
2. Create a test user with a known `tenant_id` and backfill `supabase_auth_id`
3. Log in at `/login`, then run the app against staging:
   - User sees data for their tenant only
   - Cross-tenant data returns empty
   - Platform owner test user sees all tenants
   - API route handlers still work (they use service role — RLS bypassed intentionally after auth checks)
4. Check Supabase logs for unexpected PostgREST errors

---

## Policy Design

All policies follow this pattern (helper functions created in migration 2 — already exist in DB):

```sql
-- SELECT: own tenant or platform_owner
create policy "tenant_isolation_select" on public.<table>
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );
```

### Helper functions (in DB, safe to call, but useless until supabase_auth_id is backfilled)

```sql
public.current_user_tenant_id() → text   -- returns user's tenant_id from users table
public.current_user_role() → text        -- returns user's role from users table
```

Both are `SECURITY DEFINER` — run as migration owner, not the requesting user.

---

## Tables Deferred to Phase 2

| Table | Reason |
|-------|--------|
| `inbound_pallets`, `inbound_boxes`, `inbound_box_items` | No `tenant_id` column — must add and backfill |
| `invoices`, `payments` | Billing logic needs deeper review |
| `shipments` | May cross tenant boundaries |
| `locations` | Reference data — assess if tenant-scoped |
| `route_exceptions` | No `tenant_id` column |
| `tenant_storage_summaries`, `putaway_suggestions` | Computed — enforce via base tables |
| `return_lines` | No `tenant_id` — parent `returns` will be protected |

---

## Emergency Rollback

```sql
alter table public.<table> disable row level security;
```

Restores open-access immediately per table.
