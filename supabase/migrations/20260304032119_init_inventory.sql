create table if not exists public.inventory_items (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  sku text not null,
  name text not null,
  location text,
  status text not null,
  qty integer not null default 0,
  min_stock integer not null default 0,
  client text
);

create index if not exists inventory_items_tenant_id_idx on public.inventory_items(tenant_id);
alter table public.inventory_items disable row level security;
