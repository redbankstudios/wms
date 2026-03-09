-- Phase 1 Security Foundation: add tenant_id to route_stops for RLS
--
-- route_stops currently inherits tenant isolation through routes.tenant_id,
-- but RLS policies need a direct column to be efficient and unambiguous.
--
-- This migration:
--   1. Adds tenant_id column (nullable initially for safe backfill)
--   2. Backfills from the parent routes table
--   3. Makes it not-null after backfill
--   4. Adds index and FK

alter table public.route_stops
  add column if not exists tenant_id text;

-- Backfill from parent route
update public.route_stops rs
set tenant_id = r.tenant_id
from public.routes r
where r.id = rs.route_id
  and rs.tenant_id is null;

-- Now enforce not-null (safe after backfill)
alter table public.route_stops
  alter column tenant_id set not null;

-- FK to tenants
alter table public.route_stops
  add constraint route_stops_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade;

create index if not exists route_stops_tenant_id_idx on public.route_stops(tenant_id);

comment on column public.route_stops.tenant_id is
  'Added by Phase 1 migration. Denormalized from routes.tenant_id for efficient RLS.';

-- ─── RLS for route_stops (applied here, after column exists) ─────────────────
alter table public.route_stops enable row level security;

create policy "route_stops_tenant_all" on public.route_stops
  for all using (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  )
  with check (
    public.current_user_role() = 'platform_owner'
    or tenant_id = public.current_user_tenant_id()
  );
