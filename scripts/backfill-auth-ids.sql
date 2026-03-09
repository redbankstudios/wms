-- =============================================================================
-- Backfill users.supabase_auth_id — Phase 1.5 Auth Linkage
-- =============================================================================
--
-- PURPOSE
--   Links existing WMS `users` rows to their Supabase Auth identities.
--   Required before RLS can be enabled (migration 20260308000002) and before
--   requireAuthenticatedUser() can resolve an AppUser for any logged-in user.
--
-- WHEN TO RUN
--   Run this once after:
--     1. Migration 20260308000001 has been applied (adds the supabase_auth_id column)
--     2. You have created matching Supabase Auth accounts for each WMS user
--
-- HOW TO USE
--   Step 1 — Find Supabase Auth UIDs
--     In Supabase Dashboard → Authentication → Users, note each user's UUID.
--     You can also query auth.users via the SQL editor (service-role access required):
--
--       select id, email from auth.users order by created_at;
--
--   Step 2 — Fill in the UPDATE statements below, matching auth.users.id to users.email
--
--   Step 3 — Run this file in Supabase Dashboard → SQL Editor (or via supabase db execute)
--
-- =============================================================================

-- ── Verify current state ──────────────────────────────────────────────────────

-- Shows which WMS users are already linked
select id, name, email, role, tenant_id,
       supabase_auth_id,
       case when supabase_auth_id is null then 'MISSING' else 'LINKED' end as link_status
from public.users
order by tenant_id, name;

-- =============================================================================
-- TEMPLATE — replace <AUTH_UUID_HERE> with the real UUID from auth.users
-- =============================================================================

-- Example: platform owner account
-- UPDATE public.users
--   SET supabase_auth_id = '<AUTH_UUID_HERE>'
--   WHERE email = 'admin@platform.com';

-- Example: tenant-1 business owner
-- UPDATE public.users
--   SET supabase_auth_id = '<AUTH_UUID_HERE>'
--   WHERE email = 'owner@techcorp.com' AND tenant_id = 'tenant-1';

-- Example: warehouse manager for tenant-1
-- UPDATE public.users
--   SET supabase_auth_id = '<AUTH_UUID_HERE>'
--   WHERE email = 'warehouse@techcorp.com' AND tenant_id = 'tenant-1';

-- =============================================================================
-- QUICK SETUP — create a test account end-to-end (run in Supabase SQL Editor)
-- =============================================================================
--
-- 1. Create the Supabase Auth user (use the Dashboard, or via the API):
--      POST /auth/v1/admin/users  { email, password, email_confirm: true }
--    Note the returned UUID (auth_uid).
--
-- 2. Insert a matching WMS users row (if one doesn't already exist):
--
--    INSERT INTO public.users (id, tenant_id, name, email, role, active, supabase_auth_id)
--    VALUES (
--      'USR-TEST-001',          -- WMS internal ID
--      'tenant-1',              -- must match an existing tenant
--      'Test Admin',
--      'test@example.com',
--      'business_owner',        -- see types/index.ts for valid roles
--      true,
--      '<AUTH_UUID_HERE>'       -- UUID from step 1
--    );
--
-- 3. Verify the link:
--    SELECT u.id, u.name, u.email, u.role, a.email as auth_email
--    FROM public.users u
--    JOIN auth.users a ON a.id = u.supabase_auth_id
--    WHERE u.id = 'USR-TEST-001';
--
-- 4. Test login at http://localhost:3000/login with the email/password from step 1.
--    On success, requireAuthenticatedUser() will resolve the AppUser correctly.
--
-- =============================================================================
-- POST-BACKFILL VERIFICATION
-- =============================================================================

-- After filling in and running the UPDATEs above, run this to confirm all
-- production users are linked before enabling RLS:

select
  count(*) filter (where supabase_auth_id is not null) as linked,
  count(*) filter (where supabase_auth_id is null)     as unlinked,
  count(*)                                              as total
from public.users
where active = true;

-- Target: unlinked = 0 before applying migration 20260308000002 (RLS).
