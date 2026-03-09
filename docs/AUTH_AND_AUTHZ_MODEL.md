# Auth & Authorization Model — Phase 1.5

**Last updated:** 2026-03-08

## Overview

Authentication (AuthN) and authorization (AuthZ) are separated into distinct layers. As of Phase 1.5, the mutation boundary is fully closed — all writes go through trusted server-side API routes. RLS is not yet enabled (see below for the true current state).

---

## True Current State

| Concern | Status |
|---------|--------|
| Auth infrastructure (session, cookies, middleware) | COMPLETE |
| All mutations through trusted API boundary | COMPLETE (Phase 1.5) |
| Audit logging on privileged mutations | COMPLETE (Phase 1.5) |
| Production redirect to /login (unauthenticated) | COMPLETE (Phase 1.5) |
| Browser reads authenticated | NOT DONE — reads use anon key, no session required |
| RLS enabled | NOT DONE — migration staged, not applied |
| `users.supabase_auth_id` backfilled | NOT DONE — column exists, no rows filled |
| DemoContext replaced with auth-derived values | NOT DONE — still client-supplied (dev/demo only) |

---

## Authentication

### Provider: Supabase Auth (email + password)

Supabase Auth issues a JWT on login. The JWT is stored in a cookie (via `@supabase/ssr`) and refreshed automatically on every request by the Next.js middleware.

### Session flow

```
User submits /login form
  → supabase.auth.signInWithPassword()
  → Supabase sets JWT cookie
  → middleware.ts calls updateSession() on every request (refreshes JWT)
  → In production, middleware also redirects unauthenticated users to /login
  → API route handlers call requireAuthenticatedUser() to validate the session
```

### Key files

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser Supabase client (anon key, respects RLS when enabled) |
| `lib/supabase/server.ts` | Server clients: session-aware (`createClient`) + admin (`createAdminClient`, service role) |
| `lib/supabase/middleware.ts` | Session cookie refresh helper |
| `middleware.ts` | Session refresh + production redirect to /login for unauthenticated requests |
| `context/AuthContext.tsx` | React context — exposes `authUser`, `authLoading`, `signOut` |
| `app/login/page.tsx` | Email/password login page |

### Dev ergonomics

The app shell at `/` still functions without a session (DemoContext controls tenant/role switching). The middleware redirect is only active when `NODE_ENV === 'production'` or `NEXT_PUBLIC_FORCE_AUTH_REDIRECT=true`. To test the login flow locally, set `NEXT_PUBLIC_FORCE_AUTH_REDIRECT=true` in `.env.local`.

---

## Authorization

### Layer structure

```
API Route Handler
  │
  ├─ requireAuthenticatedUser()   → verifies JWT, resolves AppUser from users table via supabase_auth_id
  │
  ├─ requireTenantAccess()        → verifies user.tenantId matches requested tenantId
  │                                 (platform_owner bypasses — deliberate cross-tenant access)
  │
  ├─ requireRole()                → verifies user has one of the allowed roles
  │                                 (platform_owner always passes)
  │
  └─ createAdminClient()          → service-role DB client, bypasses RLS
      (used ONLY after the three checks above pass)
```

### Key files

| File | Purpose |
|------|---------|
| `lib/authz/index.ts` | All auth/authz primitives + `logAuditEvent` |
| `lib/api/client.ts` | `apiMutate` — sends mutations from the data provider to API routes with session cookies |

### Primitives

#### `requireAuthenticatedUser()`
- Calls `supabase.auth.getUser()` — verifies JWT cryptographically
- Looks up the WMS `users` row via `supabase_auth_id = auth.uid()`
- Returns `{ authUser, appUser }` or throws `AuthError(401 | 403 | 500)`
- **Requires `users.supabase_auth_id` to be backfilled** — returns 403 otherwise

#### `requireTenantAccess(appUser, requestedTenantId)`
- `platform_owner`: passes always
- Others: must match `appUser.tenantId`
- Throws `AuthError(403)` on mismatch

#### `requireRole(appUser, allowedRoles)`
- `platform_owner`: always passes
- Others: must be in `allowedRoles`
- Throws `AuthError(403)` on mismatch

#### `resolveAuth(requestedTenantId)` — dev-mode aware resolver
- Production: delegates to `requireAuthenticatedUser()` — full enforcement
- Development + no session: returns `devMode: true`, skips auth/tenant/role but runs payload validation
- Callers use: `const { appUser, devMode } = await resolveAuth(tenantId)`

#### `logAuditEvent(db, tenantId, actorId, eventType, entityId, metadata?)`
- Inserts a row into the `events` table using the admin client
- Never throws — audit failure must not roll back a successful mutation
- actorId is `appUser.id` in production, `null` in dev-bypass mode

#### `withAuth(handler)` — convenience wrapper
Catches `AuthError` and returns the appropriate HTTP response automatically.

---

## Role Model

| Role | Cross-tenant | API write access |
|------|-------------|-----------------|
| `platform_owner` | Yes | All domains |
| `business_owner` | No | All domains for own tenant |
| `warehouse_manager` | No | Inventory, tasks, routes |
| `shipping_manager` | No | Orders (ship/transit), routes |
| `warehouse_employee` | No | Tasks |
| `packer` | No | Tasks |
| `driver` | No | Order delivery status, route stops |
| `driver_dispatcher` | No | Routes, route stops |
| `b2b_client` | No | None (read only) |
| `end_customer` | No | None (read only) |

---

## Current Read Path

**All reads use the anon key directly** via `lib/supabaseRest.ts`. With RLS disabled (current state), this returns full data with no session required. This is intentional for the development phase.

When RLS is eventually enabled, reads will return empty data unless the request carries a valid Supabase session JWT. At that point, reads must be moved to server-side paths before RLS is enabled. See `docs/RLS_ROLLOUT_PLAN.md`.

---

## What Is NOT Enforced Yet

| Gap | Risk | Phase |
|-----|------|-------|
| Browser reads still use anon key (no session required) | Low (read-only, RLS disabled) | 2 |
| DemoContext role/tenant switching is not auth-derived | Dev/demo only | 2 |
| No invite/signup flow for new users | Operations | 2 |
| RLS not enabled (writes isolated by API layer, not DB) | Medium | 2 |
| `users.supabase_auth_id` not backfilled (login returns 403) | Blocks auth | Before Phase 2 |
| No per-field-change access control | Low | 3 |

---

## Phase 2 Checklist (in order)

1. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel
2. Run `scripts/backfill-auth-ids.sql` — link auth UIDs to WMS users rows
3. Test login at `/login` end-to-end (verify mutations work authenticated)
4. Move browser reads to server-side paths (prerequisite for RLS)
5. Apply RLS migration `20260308000002` table by table per `docs/RLS_ROLLOUT_PLAN.md`
6. Replace DemoContext with auth-derived session tenant/role
7. Build invite/onboarding flow for new users
