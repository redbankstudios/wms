# Env And Secrets

## Referenced env vars in code

| Variable | Where used | Local required | Prod required | Example placeholder |
|---|---|---:|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabaseRest.ts` | Yes (when using Supabase provider) | Yes | `https://YOUR_PROJECT.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabaseRest.ts` | Yes (when using Supabase provider) | Yes | `eyJhbGciOi...` |
| `NEXT_PUBLIC_DATA_PROVIDER` | `data/index.ts` | Optional (defaults to mock if not `supabase`) | Yes (set explicitly) | `supabase` |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `components/screens/dispatch-map.tsx`, `components/screens/dispatcher-map.tsx`, `components/screens/drivers-zones-map.tsx`, `components/screens/mobile-driver-map.tsx`, `components/screens/orders.tsx` | Required for map/geocoding features | Required for map/geocoding features | `pk.XXXXXXXXXXXXXXXX` |
| `DISABLE_HMR` | `next.config.ts` (dev webpack config) | Optional | No | `true` |

## Env vars present in repo templates but not referenced by scanned app code
- `GEMINI_API_KEY` in `.env.example`.
- `APP_URL` in `.env.example`.
- Status: `UNKNOWN` if used by external tooling outside scanned source.

## Supabase assumptions
- Repo includes local Supabase CLI config: `supabase/config.toml`.
- Local defaults:
  - API: `http://127.0.0.1:54321`
  - DB: `54322`
  - Studio: `54323`
- Seed configured via `supabase/seed.sql` and migration seed scripts.
- Auth is enabled in local config, but app-level auth integration in UI is `UNKNOWN` (current UI uses `DemoContext`).

## Vercel/hosting assumptions
- `vercel.json` not found.
- Build settings inferred from Next config:
  - `output: "standalone"`
  - lint ignored during build (`eslint.ignoreDuringBuilds: true`)
- Required production secrets/env are the same `NEXT_PUBLIC_*` values above.

## Security handling notes
- `NEXT_PUBLIC_*` variables are exposed client-side by design.
- Keep sensitive server-only keys out of `NEXT_PUBLIC_*`.
- `.env.local` currently exists in workspace; verify it is gitignored and rotate tokens if accidentally shared.
