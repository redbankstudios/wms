create table if not exists public.orders (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  order_number text,
  status text,
  priority text,
  customer text,
  destination text,
  created_at text,
  due_date text,
  items integer,
  total_weight text,
  route_id text
);

create index if not exists orders_tenant_id_idx on public.orders(tenant_id);

create table if not exists public.order_lines (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  sku text,
  name text,
  quantity integer,
  location text,
  status text
);

create index if not exists order_lines_order_id_idx on public.order_lines(order_id);

alter table public.orders disable row level security;
alter table public.order_lines disable row level security;
