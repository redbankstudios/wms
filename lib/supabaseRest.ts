const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function supabaseSelect<T>(table: string, query: string = ""): Promise<T[]> {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error(
      `[supabaseRest] Missing env vars: NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL ?? "undefined"}, NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY ? "(set)" : "undefined"}. Check .env.local and restart the dev server.`
    )
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY ?? "",
      Authorization: `Bearer ${ANON_KEY ?? ""}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  return await res.json()
}

export async function supabasePatch(table: string, query: string, payload: Record<string, unknown>): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: ANON_KEY ?? "",
      Authorization: `Bearer ${ANON_KEY ?? ""}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }
}

export async function supabaseInsert<T>(table: string, payload: Record<string, unknown>): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: ANON_KEY ?? "",
      Authorization: `Bearer ${ANON_KEY ?? ""}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  const rows = await res.json()
  return rows[0] as T
}

export async function supabaseDelete(table: string, query: string): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: ANON_KEY ?? "",
      Authorization: `Bearer ${ANON_KEY ?? ""}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }
}
