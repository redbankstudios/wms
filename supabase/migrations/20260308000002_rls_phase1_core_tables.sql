-- ════════════════════════════════════════════════════════════════════════════
-- Phase 1 RLS Foundation — Core Tenant-Scoped Tables
-- ════════════════════════════════════════════════════════════════════════════
--
-- ██████████████████████████████████████████████████████████
-- ██  DO NOT APPLY UNTIL Phase 1.5 prerequisites are met:  ██
-- ██                                                        ██
-- ██  1. Login flow is wired (users can get a JWT)          ██
-- ██  2. users.supabase_auth_id is backfilled               ██
-- ██  3. All data reads go through authenticated paths      ██
-- ██     (server components or API routes with session)     ██
-- ██                                                        ██
-- ██  Enabling RLS without these will break the app:        ██
-- ██  the current anon-key browser reads will return empty  ██
-- ██  (RLS filters out all rows for unauthenticated users). ██
-- ██                                                        ██
-- ██  Safe activation checklist in docs/RLS_ROLLOUT_PLAN.md ██
-- ██████████████████████████████████████████████████████████
--
-- Design principles:
--   • auth.uid() JWT is the trust anchor — never trust client-supplied tenant_id
--   • Tenant binding derived from users table row, not JWT custom claims
--   • platform_owner gets cross-tenant access through a deliberate role check
--   • service_role key (API route handlers) bypasses RLS — intentional and safe
--     because handlers enforce auth BEFORE using the admin client
--
-- NOTE: Helper functions are in the `public` schema because hosted Supabase
-- migrations cannot write to the `auth` schema directly.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Helper functions ────────────────────────────────────────────────────────

-- Resolve tenant_id for the currently authenticated user.
-- Called in every RLS policy to avoid repeated subquery boilerplate.
create or replace function public.current_user_tenant_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id::text
  from public.users
  where supabase_auth_id = auth.uid()
  limit 1
$$;

-- Resolve role for the currently authenticated user.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.users
  where supabase_auth_id = auth.uid()
  limit 1
$$;

-- ─── orders ──────────────────────────────────────────────────────────────────
alter table public.orders enable row level security;

create policy "orders_tenant_select" on public.orders
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "orders_tenant_insert" on public.orders
  for insert with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "orders_tenant_update" on public.orders
  for update using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "orders_tenant_delete" on public.orders
  for delete using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── order_lines ─────────────────────────────────────────────────────────────
alter table public.order_lines enable row level security;

create policy "order_lines_tenant_select" on public.order_lines
  for select using (
    public.current_user_role() = 'platform_owner'
    or exists (
      select 1 from public.orders o
      where o.id = order_lines.order_id
        and o.tenant_id = public.current_user_tenant_id()
    )
  );

create policy "order_lines_tenant_insert" on public.order_lines
  for insert with check (
    public.current_user_role() = 'platform_owner'
    or exists (
      select 1 from public.orders o
      where o.id = order_lines.order_id
        and o.tenant_id = public.current_user_tenant_id()
    )
  );

create policy "order_lines_tenant_update" on public.order_lines
  for update using (
    public.current_user_role() = 'platform_owner'
    or exists (
      select 1 from public.orders o
      where o.id = order_lines.order_id
        and o.tenant_id = public.current_user_tenant_id()
    )
  );

create policy "order_lines_tenant_delete" on public.order_lines
  for delete using (
    public.current_user_role() = 'platform_owner'
    or exists (
      select 1 from public.orders o
      where o.id = order_lines.order_id
        and o.tenant_id = public.current_user_tenant_id()
    )
  );

-- ─── inventory_items ─────────────────────────────────────────────────────────
alter table public.inventory_items enable row level security;

create policy "inventory_items_tenant_select" on public.inventory_items
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "inventory_items_tenant_insert" on public.inventory_items
  for insert with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "inventory_items_tenant_update" on public.inventory_items
  for update using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "inventory_items_tenant_delete" on public.inventory_items
  for delete using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── tasks ───────────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;

create policy "tasks_tenant_select" on public.tasks
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "tasks_tenant_insert" on public.tasks
  for insert with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "tasks_tenant_update" on public.tasks
  for update using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "tasks_tenant_delete" on public.tasks
  for delete using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── routes ──────────────────────────────────────────────────────────────────
alter table public.routes enable row level security;

create policy "routes_tenant_all" on public.routes
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── route_stops — RLS deferred to 20260308000003 ───────────────────────────
-- route_stops.tenant_id column is added in migration 20260308000003.
-- RLS policy is applied in that migration, after the column exists.

-- ─── returns ─────────────────────────────────────────────────────────────────
alter table public.returns enable row level security;

create policy "returns_tenant_select" on public.returns
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "returns_tenant_update" on public.returns
  for update using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── drivers ─────────────────────────────────────────────────────────────────
alter table public.drivers enable row level security;

create policy "drivers_tenant_all" on public.drivers
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── vehicles ────────────────────────────────────────────────────────────────
alter table public.vehicles enable row level security;

create policy "vehicles_tenant_all" on public.vehicles
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── delivery_zones ──────────────────────────────────────────────────────────
alter table public.delivery_zones enable row level security;

create policy "delivery_zones_tenant_all" on public.delivery_zones
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── driver_messages ─────────────────────────────────────────────────────────
alter table public.driver_messages enable row level security;

create policy "driver_messages_tenant_select" on public.driver_messages
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "driver_messages_tenant_insert" on public.driver_messages
  for insert with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "driver_messages_tenant_update" on public.driver_messages
  for update using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── warehouse_zones ─────────────────────────────────────────────────────────
alter table public.warehouse_zones enable row level security;

create policy "warehouse_zones_tenant_all" on public.warehouse_zones
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── racks ───────────────────────────────────────────────────────────────────
alter table public.racks enable row level security;

create policy "racks_tenant_all" on public.racks
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── storage_locations ───────────────────────────────────────────────────────
alter table public.storage_locations enable row level security;

create policy "storage_locations_tenant_all" on public.storage_locations
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── inbound_shipments ───────────────────────────────────────────────────────
alter table public.inbound_shipments enable row level security;

create policy "inbound_shipments_tenant_all" on public.inbound_shipments
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── notifications ───────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

create policy "notifications_tenant_select" on public.notifications
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── events ──────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

create policy "events_tenant_select" on public.events
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

create policy "events_tenant_insert" on public.events
  for insert with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── clients ─────────────────────────────────────────────────────────────────
alter table public.clients enable row level security;

create policy "clients_tenant_all" on public.clients
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── products ────────────────────────────────────────────────────────────────
alter table public.products enable row level security;

create policy "products_tenant_all" on public.products
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );

-- ─── users ───────────────────────────────────────────────────────────────────
-- RISK: high — enable this LAST, only after all other policies are tested
-- and supabase_auth_id is backfilled. Without it, current_user_tenant_id()
-- returns null and all tenant policies silently block everyone.
alter table public.users enable row level security;

create policy "users_tenant_select" on public.users
  for select using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
    or supabase_auth_id = auth.uid()  -- always allow own row (needed for auth resolution)
  );

create policy "users_own_update" on public.users
  for update using (
    supabase_auth_id = auth.uid()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() in ('warehouse_manager', 'business_owner')
    )
    or public.current_user_role() = 'platform_owner'
  );

-- ─── tenants ─────────────────────────────────────────────────────────────────
-- RISK: high — enables after users policy is confirmed working
alter table public.tenants enable row level security;

create policy "tenants_own_select" on public.tenants
  for select using (
    public.current_user_role() = 'platform_owner'
    or id = public.current_user_tenant_id()
  );

create policy "tenants_platform_owner_write" on public.tenants
  for all using (public.current_user_role() = 'platform_owner')
  with check (public.current_user_role() = 'platform_owner');

-- ─── Tables deferred to Phase 2 ──────────────────────────────────────────────
-- inbound_pallets      — no tenant_id column; needs schema change
-- inbound_boxes        — no tenant_id column
-- inbound_box_items    — no tenant_id column
-- invoices             — billing logic needs review
-- payments             — billing logic needs review
-- shipments            — may cross tenant (carrier data)
-- locations            — reference data; assess if tenant-scoped
-- route_exceptions     — no tenant_id column currently
-- tenant_storage_summaries — computed; enforce via base tables
-- putaway_suggestions  — computed; enforce via base tables
-- See docs/RLS_ROLLOUT_PLAN.md for full rationale.
