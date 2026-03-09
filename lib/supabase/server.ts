/**
 * Server-side Supabase clients.
 *
 * createClient()      — session-aware client using the user's JWT (anon key + RLS).
 *                       Use in Server Components and API route handlers when you need
 *                       to operate as the authenticated user.
 *
 * createAdminClient() — service-role client that BYPASSES RLS.
 *                       Use ONLY in trusted server-side API handlers after explicit
 *                       authorization checks (requireAuthenticatedUser + requireTenantAccess).
 *                       NEVER expose to the browser. NEVER use before auth is verified.
 */
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/** Session-aware server client — respects RLS */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // The middleware handles refreshing the session cookie.
          }
        },
      },
    }
  )
}

/**
 * Service-role admin client — bypasses RLS.
 *
 * IMPORTANT: Only call this after you have:
 *   1. Verified the user is authenticated (requireAuthenticatedUser)
 *   2. Verified tenant ownership (requireTenantAccess)
 *   3. Validated the payload shape
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in server environment.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Set it in your server environment (never expose it to the browser)."
    )
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        // Disable auto-refresh — this is a server-side client used for single requests
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}
