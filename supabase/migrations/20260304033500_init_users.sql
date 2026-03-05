create table if not exists public.users (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  email text,
  role text not null,
  active boolean not null default true
);

create index if not exists users_tenant_id_idx on public.users(tenant_id);

alter table public.users disable row level security;
