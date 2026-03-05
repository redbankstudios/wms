create table if not exists public.locations (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  type text not null default 'warehouse'
);

create index if not exists locations_tenant_id_idx on public.locations(tenant_id);

alter table public.locations disable row level security;
