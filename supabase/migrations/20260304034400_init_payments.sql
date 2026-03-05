create table if not exists public.payments (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  amount text not null,
  status text not null default 'pending',
  billing_period text,
  plan text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payments_tenant_id_idx on public.payments(tenant_id);
create index if not exists payments_client_id_idx on public.payments(client_id);

alter table public.payments disable row level security;
