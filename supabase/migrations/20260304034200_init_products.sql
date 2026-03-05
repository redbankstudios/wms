create table if not exists public.products (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  sku text not null,
  name text not null,
  barcode text,
  weight text,
  dimensions text,
  unit_cost text,
  status text not null default 'active'
);

create unique index if not exists products_tenant_sku_idx on public.products(tenant_id, sku);
create index if not exists products_client_id_idx on public.products(client_id);

alter table public.products disable row level security;
