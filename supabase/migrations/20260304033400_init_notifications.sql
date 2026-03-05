create table if not exists public.notifications (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  type text,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_tenant_id_idx on public.notifications(tenant_id);

alter table public.notifications disable row level security;
