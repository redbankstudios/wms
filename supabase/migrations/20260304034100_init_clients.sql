create table if not exists public.clients (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  billing_plan text,
  status text not null default 'active'
);

create index if not exists clients_tenant_id_idx on public.clients(tenant_id);

alter table public.clients disable row level security;
