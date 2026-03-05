create table if not exists public.tasks (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  type text not null,
  status text not null,
  assignee text,
  location text,
  items integer not null default 0,
  priority text not null default 'normal',
  created_at timestamptz not null default now()
);

create index if not exists tasks_tenant_id_idx on public.tasks(tenant_id);

alter table public.tasks disable row level security;
