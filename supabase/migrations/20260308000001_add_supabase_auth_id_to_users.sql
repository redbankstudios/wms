-- Phase 1 Security Foundation: Link WMS users to Supabase Auth identities
--
-- Adds `supabase_auth_id` column to the `users` table.
-- This column stores the Supabase Auth UID (auth.uid()) for each user, enabling:
--   1. requireAuthenticatedUser() in lib/authz/index.ts to resolve session → WMS user
--   2. RLS policies in Phase 1 migration (20260308000002_rls_phase1_core_tables.sql)
--      to scope data access using auth.uid()
--
-- IMPORTANT: After applying this migration, backfill existing user rows with their
-- Supabase Auth UIDs. Users without a supabase_auth_id will get 403 from API routes.
-- New users must be created in both Supabase Auth and the users table.
--
-- TODO (Phase 1.5): Add a trigger or Edge Function that auto-creates a users row
-- when a new Supabase Auth user is created (via invite or sign-up flow).

alter table public.users
  add column if not exists supabase_auth_id uuid unique references auth.users(id) on delete set null;

-- Index for fast lookup by auth.uid() in RLS policies and API route handlers
create index if not exists idx_users_supabase_auth_id
  on public.users (supabase_auth_id);

comment on column public.users.supabase_auth_id is
  'References auth.users(id) — the Supabase Auth UID for this WMS user. '
  'Used for session-to-user resolution in API route handlers and RLS policies.';
