-- ── Delivery Zones ────────────────────────────────────────────────────────────
-- Radius-circle geographic zones radiating from a warehouse location.
-- Drivers are assigned a primary zone; orders are auto-matched by proximity.

create table if not exists public.delivery_zones (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  location_id text references public.locations(id),
  name        text not null,
  center_lat  double precision not null,
  center_lng  double precision not null,
  radius_km   double precision not null default 15,
  color       text not null default '#3b82f6',
  description text
);

create index if not exists delivery_zones_tenant_id_idx on public.delivery_zones(tenant_id);
alter table public.delivery_zones disable row level security;

-- ── Drivers ───────────────────────────────────────────────────────────────────
-- Full driver profiles independent of the route rows.
-- max_stops enforces how many stops a dispatcher can assign per shift.

create table if not exists public.drivers (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  vehicle_id  text,
  zone_id     text references public.delivery_zones(id),
  max_stops   integer not null default 15,
  status      text not null default 'active',   -- active | off_duty | on_leave
  created_at  timestamptz default now()
);

create index if not exists drivers_tenant_id_idx on public.drivers(tenant_id);
alter table public.drivers disable row level security;

-- ── Extend orders ─────────────────────────────────────────────────────────────
-- Delivery lat/lng stored after geocoding so we never call the API twice.
alter table public.orders
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision;

-- ── Extend vehicles ───────────────────────────────────────────────────────────
-- Hard cargo limits used by the auto-assignment algorithm.
alter table public.vehicles
  add column if not exists max_weight_kg integer not null default 1000,
  add column if not exists max_packages  integer not null default 200;

-- ── Extend route_stops ────────────────────────────────────────────────────────
-- Per-stop weight tracked so we can sum current load vs vehicle capacity.
alter table public.route_stops
  add column if not exists weight_kg numeric(8,2);
