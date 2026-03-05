create table if not exists public.vehicles (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  type text,
  plate text,
  status text not null default 'good',
  driver text,
  location text,
  last_service text,
  next_service text
);

create index if not exists vehicles_tenant_id_idx on public.vehicles(tenant_id);

alter table public.vehicles disable row level security;
