create table if not exists public.inbound_shipments (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  reference_number text,
  carrier text,
  status text not null default 'scheduled',
  arrival_date text,
  arrival_window_start text,
  arrival_window_end text,
  dock_door text,
  notes text,
  total_pallets integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists inbound_shipments_tenant_id_idx on public.inbound_shipments(tenant_id);
create index if not exists inbound_shipments_status_idx on public.inbound_shipments(status);

create table if not exists public.inbound_pallets (
  id text primary key,
  shipment_id text not null references public.inbound_shipments(id) on delete cascade,
  tenant_id text not null references public.tenants(id) on delete cascade,
  pallet_number text not null,
  client_id text references public.clients(id) on delete set null,
  length text,
  width text,
  height text,
  weight text,
  assigned_zone_id text references public.warehouse_zones(id) on delete set null,
  assigned_rack_id text references public.racks(id) on delete set null,
  assigned_location_code text,
  status text not null default 'expected'
);

create index if not exists inbound_pallets_shipment_id_idx on public.inbound_pallets(shipment_id);

create table if not exists public.inbound_boxes (
  id text primary key,
  pallet_id text not null references public.inbound_pallets(id) on delete cascade,
  box_number text not null,
  length text,
  width text,
  height text,
  weight text
);

create index if not exists inbound_boxes_pallet_id_idx on public.inbound_boxes(pallet_id);

create table if not exists public.inbound_box_items (
  id text primary key,
  box_id text not null references public.inbound_boxes(id) on delete cascade,
  sku text not null,
  product_name text not null,
  quantity integer not null default 0,
  unit_weight text,
  unit_dimensions text
);

create index if not exists inbound_box_items_box_id_idx on public.inbound_box_items(box_id);

alter table public.inbound_shipments disable row level security;
alter table public.inbound_pallets disable row level security;
alter table public.inbound_boxes disable row level security;
alter table public.inbound_box_items disable row level security;
