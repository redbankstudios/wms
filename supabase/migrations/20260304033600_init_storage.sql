create table if not exists public.warehouse_zones (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  warehouse_id text not null,
  name text not null,
  type text not null,
  color text,
  total_capacity integer not null default 0,
  used_capacity integer not null default 0
);

create index if not exists warehouse_zones_tenant_id_idx on public.warehouse_zones(tenant_id);

create table if not exists public.racks (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  warehouse_id text not null,
  zone_id text not null references public.warehouse_zones(id) on delete cascade,
  code text not null,
  side text,
  level_count integer not null default 0,
  bay_count integer not null default 0,
  total_capacity integer not null default 0,
  used_capacity integer not null default 0,
  preferred_client_id text
);

create index if not exists racks_zone_id_idx on public.racks(zone_id);
create index if not exists racks_tenant_id_idx on public.racks(tenant_id);

create table if not exists public.storage_locations (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  warehouse_id text not null,
  zone_id text not null references public.warehouse_zones(id) on delete cascade,
  rack_id text not null references public.racks(id) on delete cascade,
  code text not null,
  level integer not null default 0,
  bay integer not null default 0,
  type text not null default 'pallet',
  max_pallets integer not null default 0,
  current_pallets integer not null default 0,
  utilization_percent integer not null default 0,
  assigned_client_id text
);

create index if not exists storage_locations_rack_id_idx on public.storage_locations(rack_id);
create index if not exists storage_locations_tenant_id_idx on public.storage_locations(tenant_id);

create table if not exists public.tenant_storage_summaries (
  client_id text primary key,
  client_name text not null,
  pallets_stored integer not null default 0,
  zones_used integer not null default 0,
  racks_used integer not null default 0,
  fragmentation_score text not null default 'low',
  preferred_zone text,
  utilization_percent integer not null default 0
);

create table if not exists public.putaway_suggestions (
  id text primary key,
  type text not null,
  message text not null,
  priority text not null default 'low',
  action_label text
);

alter table public.warehouse_zones disable row level security;
alter table public.racks disable row level security;
alter table public.storage_locations disable row level security;
alter table public.tenant_storage_summaries disable row level security;
alter table public.putaway_suggestions disable row level security;
