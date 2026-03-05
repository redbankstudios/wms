create table if not exists public.shipments (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  tracking_number text,
  carrier text,
  status text not null default 'pending',
  weight text,
  dimensions text,
  created_at timestamptz not null default now()
);

create index if not exists shipments_tenant_id_idx on public.shipments(tenant_id);
create index if not exists shipments_order_id_idx on public.shipments(order_id);

alter table public.shipments disable row level security;
