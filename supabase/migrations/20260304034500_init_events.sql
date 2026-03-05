create table if not exists public.events (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  source text not null,
  event_type text not null,
  payload jsonb,
  received_at timestamptz not null default now()
);

create index if not exists events_tenant_id_idx on public.events(tenant_id);
create index if not exists events_event_type_idx on public.events(event_type);
create index if not exists events_received_at_idx on public.events(received_at desc);

alter table public.events disable row level security;
