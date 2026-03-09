# Multi-Tenant Architecture Model

## 1) Tenant identity model
- Tenant context is selected in client state (`DemoContext`):
  - `selectedTenant.id` drives most data queries.
- Demo tenants are hard-coded in `context/DemoContext.tsx`.
- Most domain types include `tenantId` in TypeScript models.

## 2) Isolation mechanism in application layer

### Primary mechanism
- Provider methods typically filter by tenant:
  - Pattern: `.../rest/v1/<table>?tenant_id=eq.{tenantId}`
- Screens pass `selectedTenant.id` into provider methods.

### Cross-tenant read behavior
- `Topbar` global search allows platform owner to call `getAll*` methods for orders/inventory/tasks/routes/returns/vehicles.
- This is an intentional cross-tenant read path for role `platform_owner`.

### Notable tenant-filter gaps
- In storage provider:
  - `getStorageSummaryByClient(_tenantId)` does not apply tenant filter.
  - `getTopFragmentedClients(_tenantId)` does not apply tenant filter.
  - `getPutawaySuggestions(_tenantId)` does not apply tenant filter.
- These methods read full-table data and can mix tenant scope.

## 3) Database-level isolation controls
- Schema includes `tenant_id` on most operational tables with FK to `tenants`.
- However, migrations explicitly disable RLS across app tables.
- No checked-in RLS policies found in repository migrations.

## 4) Auth and permissions model (current implementation)

### Role permissions
- Role access is enforced in UI navigation/render logic:
  - `config/roleNavigation.ts`
  - `app/page.tsx` access check for active tab
- This is client-side gating, not server-enforced authorization.

### Authentication
- No Next.js auth middleware/session guard found.
- `lib/supabaseRest.ts` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` directly from browser for all CRUD requests.
- No Supabase Auth session token usage in app data requests.

### Supabase auth config
- `supabase/config.toml` has auth enabled settings, but app code does not wire login/session into provider calls.

## 5) Risk summary
- Tenant isolation currently depends on client behavior and query discipline.
- With RLS disabled and anon-key browser access, DB-level tenant enforcement is weak.
- Client-side role checks can be bypassed outside UI if API credentials are exposed.

## UNKNOWN
- UNKNOWN: whether production Supabase instance has manual RLS/policies not present in local migrations.
- UNKNOWN: whether an external gateway/API exists outside this repository that enforces stronger authz.
