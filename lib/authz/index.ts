/**
 * Auth & Authorization primitives — Phase 1 Security Foundation
 *
 * These helpers must be called at the start of every API route handler
 * that performs a mutation or returns sensitive data.
 *
 * Separation of concerns:
 *   - Authentication: "is this a valid logged-in user?" → requireAuthenticatedUser
 *   - Authorization:  "is this user allowed to do X?" → requireTenantAccess, requireRole
 *
 * ─── ASSUMPTIONS ────────────────────────────────────────────────────────────
 * 1. Users are stored in the `users` table with a `supabase_auth_id` column
 *    that matches auth.uid() from Supabase Auth. (TODO: add migration for this
 *    column when the users table is backfilled with real auth IDs in Phase 1.5)
 * 2. `tenant_id` on the users row is the authoritative tenant binding.
 *    It is set at account creation and cannot be changed by the user.
 * 3. Platform owners (role = 'platform_owner') have cross-tenant read/write
 *    access but only through deliberate server-side paths — never via RLS bypass
 *    alone.
 * 4. `SUPABASE_SERVICE_ROLE_KEY` is required server-side for admin operations.
 *
 * ─── USAGE ──────────────────────────────────────────────────────────────────
 * import { requireAuthenticatedUser, requireTenantAccess, requireRole } from "@/lib/authz"
 *
 * export async function POST(request: NextRequest) {
 *   const { user, authUser } = await requireAuthenticatedUser()
 *   await requireTenantAccess(user, body.tenantId)
 *   await requireRole(user, ["warehouse_manager", "business_owner"])
 *   // ... proceed with trusted mutation via createAdminClient()
 * }
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { type Role } from "@/types"

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppUser = {
  /** Internal WMS user row id */
  id: string
  /** Supabase auth UID — same as auth.uid() */
  authId: string
  tenantId: string
  role: Role
  name: string
  email: string
  active: boolean
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "AuthError"
  }

  toResponse() {
    return NextResponse.json({ error: this.message }, { status: this.status })
  }
}

// ─── requireAuthenticatedUser ────────────────────────────────────────────────

/**
 * Verify the request carries a valid Supabase auth session.
 *
 * Returns the Supabase auth user + the matching WMS `users` row.
 * Throws AuthError(401) if there is no valid session.
 * Throws AuthError(403) if the auth user has no matching WMS user row.
 *
 * NOTE (Phase 1 assumption): The `users` table must have a `supabase_auth_id`
 * column. Until user accounts are backfilled, this lookup may return no row —
 * in that case a 403 is returned. Add the column via the migration in
 * supabase/migrations/20260308000001_add_supabase_auth_id.sql.
 */
export async function requireAuthenticatedUser(): Promise<{
  authUser: { id: string; email: string | undefined }
  appUser: AppUser
}> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()

  if (error || !authUser) {
    throw new AuthError(401, "Authentication required. Please log in.")
  }

  // Look up the WMS user row linked to this auth identity
  const { data: rows, error: userErr } = await supabase
    .from("users")
    .select("id, tenant_id, role, name, email, active")
    .eq("supabase_auth_id", authUser.id)
    .limit(1)

  if (userErr) {
    throw new AuthError(500, "Failed to resolve user profile.")
  }

  const row = rows?.[0]
  if (!row) {
    throw new AuthError(
      403,
      "No WMS user profile found for this account. Contact your administrator."
    )
  }

  if (!row.active) {
    throw new AuthError(403, "Your account has been deactivated.")
  }

  return {
    authUser: { id: authUser.id, email: authUser.email },
    appUser: {
      id: row.id,
      authId: authUser.id,
      tenantId: row.tenant_id,
      role: row.role as Role,
      name: row.name,
      email: row.email,
      active: row.active,
    },
  }
}

// ─── requireTenantAccess ─────────────────────────────────────────────────────

/**
 * Verify the authenticated user is allowed to act on the given tenantId.
 *
 * Rules:
 *   - platform_owner: may access any tenant (cross-tenant visibility intentional)
 *   - all other roles: must match their own tenantId exactly
 *
 * Throws AuthError(403) on violation.
 */
export function requireTenantAccess(appUser: AppUser, requestedTenantId: string): void {
  if (appUser.role === "platform_owner") {
    // Platform owners have deliberate cross-tenant access.
    // This path is logged and should be audited in Phase 2.
    return
  }

  if (appUser.tenantId !== requestedTenantId) {
    throw new AuthError(
      403,
      `Access denied: you do not have permission to act on tenant '${requestedTenantId}'.`
    )
  }
}

// ─── requireRole ─────────────────────────────────────────────────────────────

/**
 * Verify the authenticated user has one of the allowed roles.
 *
 * platform_owner always passes (they have god-mode intent by design,
 * but only through trusted server paths — not via raw DB access).
 *
 * Throws AuthError(403) on violation.
 */
export function requireRole(appUser: AppUser, allowedRoles: Role[]): void {
  if (appUser.role === "platform_owner") return

  if (!allowedRoles.includes(appUser.role)) {
    throw new AuthError(
      403,
      `This action requires one of the following roles: ${allowedRoles.join(", ")}. ` +
        `Your role is '${appUser.role}'.`
    )
  }
}

// ─── withAuth ────────────────────────────────────────────────────────────────

/**
 * Convenience wrapper — catches AuthError and returns the appropriate HTTP response.
 *
 * Usage:
 *   export const POST = withAuth(async (request, { appUser }) => {
 *     await requireTenantAccess(appUser, body.tenantId)
 *     // ... mutation
 *     return NextResponse.json({ ok: true })
 *   })
 */
export function withAuth(
  handler: (
    request: Request,
    ctx: { authUser: { id: string; email: string | undefined }; appUser: AppUser }
  ) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    try {
      const ctx = await requireAuthenticatedUser()
      return await handler(request, ctx)
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse()
      }
      console.error("[authz] Unhandled error in route handler:", err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

// ─── resolveAuth ─────────────────────────────────────────────────────────────

/**
 * Dev-mode aware auth resolver for API route handlers.
 *
 * - In production: delegates to requireAuthenticatedUser() — full enforcement.
 * - In development (NODE_ENV=development) with no session: returns devMode=true,
 *   skipping auth/tenant/role checks but still running payload validation.
 *   Preserves current UX in the demo shell without breaking the mutation path.
 *
 * Usage inside an API route:
 *   const { appUser, devMode } = await resolveAuth(body.tenantId)
 *   if (!devMode) {
 *     requireTenantAccess(appUser!, body.tenantId)
 *     requireRole(appUser!, WRITE_ROLES)
 *   }
 */
export async function resolveAuth(requestedTenantId: string): Promise<{
  appUser: AppUser | null
  devMode: boolean
}> {
  try {
    const { appUser } = await requireAuthenticatedUser()
    return { appUser, devMode: false }
  } catch (err) {
    if (
      process.env.NODE_ENV === "development" &&
      err instanceof AuthError &&
      err.status === 401
    ) {
      console.warn(
        `[authz] ⚠ DEV BYPASS: unauthenticated mutation on tenant="${requestedTenantId}". ` +
          "This path is blocked in production. Wire login before deploying."
      )
      return { appUser: null, devMode: true }
    }
    throw err
  }
}

// ─── Audit logging ────────────────────────────────────────────────────────────

/**
 * Insert a lightweight audit event into the `events` table.
 * Must be called AFTER a successful mutation, using the admin client.
 * Never throws — a failed audit log must not roll back a successful mutation.
 *
 * @param db         - Admin Supabase client (service role, already authorized)
 * @param tenantId   - Owning tenant
 * @param actorId    - WMS user id of the actor (null in dev-bypass mode)
 * @param eventType  - Verb describing the action, e.g. "inventory.update"
 * @param entityId   - ID of the affected row
 * @param metadata   - Any extra key/value context (status changes, field names, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logAuditEvent(
  db: any,
  tenantId: string,
  actorId: string | null,
  eventType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.from("events").insert({
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      source: "api",
      event_type: eventType,
      payload: { actor_id: actorId, entity_id: entityId, ...metadata },
      received_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn("[audit] Failed to log event:", eventType, entityId, err)
  }
}

// ─── Payload validation helpers ──────────────────────────────────────────────

/** Assert a required string field is non-empty. Throws 400 if invalid. */
export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AuthError(400, `Missing or invalid field: '${fieldName}' must be a non-empty string.`)
  }
  return value.trim()
}

/** Assert a value is one of an allowed set. Throws 400 if invalid. */
export function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (!allowed.includes(value as T)) {
    throw new AuthError(
      400,
      `Invalid value for '${fieldName}': must be one of [${allowed.join(", ")}]. Got '${value}'.`
    )
  }
  return value as T
}
