create table if not exists public.tenants (
  id text primary key,
  name text not null,
  contact text,
  email text,
  phone text,
  status text not null default 'active',
  storage_used integer not null default 0,
  storage_capacity integer not null default 0,
  storage_label text,
  plan text,
  address text,
  joined text,
  billing_cycle text,
  payment_method text,
  created_at timestamptz not null default now()
);

-- Unrestrictive for now: no RLS.
alter table public.tenants disable row level security;