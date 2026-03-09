/**
 * Internal API client helper — used by data/providers/supabase/index.ts
 * to call the trusted backend mutation routes instead of writing directly
 * to Supabase via the anon key.
 *
 * Sends cookies with every request (`credentials: 'include'`) so the
 * Supabase auth session is forwarded to the API route handler for
 * authentication and authorization checks.
 *
 * In development without a login session, the API route handlers fall back
 * to dev-bypass mode (payload validated, auth skipped) — see lib/authz/index.ts.
 */

type ApiMethod = "POST" | "PATCH" | "DELETE"

export async function apiMutate<T = unknown>(
  path: string,
  method: ApiMethod,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error(`API ${method} ${path} failed with status ${res.status} (no JSON body)`)
  }

  if (!res.ok) {
    const errData = data as { error?: string }
    throw new Error(errData?.error ?? `API ${method} ${path} failed with status ${res.status}`)
  }

  return data as T
}
