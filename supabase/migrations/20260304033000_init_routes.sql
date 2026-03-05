create table if not exists public.routes (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  driver_id text,
  driver_name text,
  vehicle_id text,
  status text not null default 'planned',
  shift text,
  progress text
);

create index if not exists routes_tenant_id_idx on public.routes(tenant_id);

create table if not exists public.route_stops (
  id text primary key,
  route_id text not null references public.routes(id) on delete cascade,
  customer text,
  address text,
  time text,
  status text not null default 'pending',
  packages integer not null default 0,
  notes text
);

create index if not exists route_stops_route_id_idx on public.route_stops(route_id);

create table if not exists public.route_exceptions (
  id text primary key,
  route_id text not null references public.routes(id) on delete cascade,
  driver text,
  stop_id text,
  customer text,
  issue text,
  time text,
  status text not null default 'unresolved'
);

create index if not exists route_exceptions_route_id_idx on public.route_exceptions(route_id);

alter table public.routes disable row level security;
alter table public.route_stops disable row level security;
alter table public.route_exceptions disable row level security;
