create table if not exists public.returns (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  order_id text,
  client text,
  date text,
  items integer not null default 0,
  reason text,
  status text not null default 'pending',
  disposition text
);

create index if not exists returns_tenant_id_idx on public.returns(tenant_id);

create table if not exists public.return_lines (
  id text primary key,
  return_id text not null references public.returns(id) on delete cascade,
  sku text,
  name text,
  qty integer not null default 0,
  condition text
);

create index if not exists return_lines_return_id_idx on public.return_lines(return_id);

alter table public.returns disable row level security;
alter table public.return_lines disable row level security;
