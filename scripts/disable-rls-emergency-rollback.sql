-- =============================================================================
-- Emergency RLS Rollback — Phase 2
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor when RLS is enabled prematurely
-- and the anon key reads return empty (supabase_auth_id not yet backfilled).
--
-- Context: RLS should remain DISABLED until ALL of the following are true:
--   1. SUPABASE_SERVICE_ROLE_KEY is configured in server environment
--   2. users.supabase_auth_id is backfilled for all active users
--   3. At least one Supabase Auth account exists and login tested end-to-end
--   4. All browser reads are moved to session-aware server-side paths
--   5. Test suite passes with RLS enabled on a staging project
--
-- See: docs/RLS_ROLLOUT_PLAN.md for the proper activation process.
-- =============================================================================

alter table public.orders disable row level security;
alter table public.routes disable row level security;
alter table public.route_stops disable row level security;
alter table public.inventory_items disable row level security;
alter table public.tasks disable row level security;
alter table public.returns disable row level security;
alter table public.drivers disable row level security;
alter table public.vehicles disable row level security;
alter table public.delivery_zones disable row level security;
alter table public.warehouse_zones disable row level security;
alter table public.racks disable row level security;
alter table public.storage_locations disable row level security;
alter table public.clients disable row level security;
alter table public.products disable row level security;
alter table public.inbound_shipments disable row level security;
alter table public.tenants disable row level security;
alter table public.users disable row level security;

-- Verify: after running, these should all return data again via the anon key.
select 'tenants'         as tbl, count(*) from public.tenants
union all
select 'orders',         count(*) from public.orders
union all
select 'inventory_items',count(*) from public.inventory_items
union all
select 'routes',         count(*) from public.routes
union all
select 'tasks',          count(*) from public.tasks;
