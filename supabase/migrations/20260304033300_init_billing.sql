create table if not exists public.invoices (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  date text,
  amount text,
  status text not null default 'due',
  period text
);

create index if not exists invoices_tenant_id_idx on public.invoices(tenant_id);

alter table public.invoices disable row level security;
