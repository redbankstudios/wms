create table if not exists public.driver_messages (
  id            text primary key,
  tenant_id     text not null references public.tenants(id) on delete cascade,
  driver_id     text not null,
  driver_name   text not null,
  route_id      text,
  parent_id     text references public.driver_messages(id) on delete cascade,
  sender_role   text not null check (sender_role in ('driver', 'dispatcher')),
  body          text not null,
  status        text not null default 'unanswered'
                  check (status in ('unanswered', 'read', 'replied')),
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

create index if not exists driver_messages_tenant_idx on public.driver_messages(tenant_id);
create index if not exists driver_messages_parent_idx on public.driver_messages(parent_id);
alter table public.driver_messages disable row level security;
