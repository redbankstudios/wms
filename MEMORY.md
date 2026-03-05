# Project Memory

## Summary
WMS & Delivery is a Next.js app that demonstrates a multi-tenant warehouse + delivery platform with role-based navigation. The UI is composed of role-specific screens (warehouse ops, dispatch, mobile, client portal) and uses a data provider abstraction to switch between mock data and Supabase.

## Tech Stack
- Next.js (App Router) + React
- Tailwind CSS + shadcn/ui components
- Lucide icons
- Supabase REST (optional) or local mock data

## App Shell
- `app/page.tsx` renders the shell with `Topbar`, `Sidebar`, and a main content area based on `activeTab`.
- `components/layout/topbar.tsx` exposes tenant/role switchers and search/notifications.
- `components/layout/sidebar.tsx` renders role-filtered navigation groups using `NAV_ITEMS` and `ROLE_LANDING_PAGES`.

## Navigation & Roles
- Navigation config lives in `config/roleNavigation.ts`.
- `ROLE_LANDING_PAGES` controls the initial screen when a role is selected.
- Roles are defined in `types` and enumerated in `context/DemoContext.tsx`.

## Data Layer
- Provider selection is centralized in `data/index.ts` using `NEXT_PUBLIC_DATA_PROVIDER`.
- `data/providers/mock` uses local datasets in `data/*.ts`.
- `data/providers/supabase` uses REST calls via `lib/supabaseRest.ts` and expects:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Contexts
- `context/DemoContext.tsx` stores tenant/role selection and demo meta (date, notifications).
- `context/MessagesContext.tsx` stores driver/customer messages for tracking chat.

## Key Directories
- `components/screens/*` per-feature screens
- `services/*` domain services used by screens
- `data/*` mock datasets and provider implementations
- `supabase/migrations/*` schema history

## Local Run
- Install: `npm install`
- Configure env: `.env.local`
- Start: `npm run dev`

## Known Gaps / Next Decisions
- Auth and real RBAC beyond demo role switching
- Real-time updates (drivers, dispatch, tracking)
- Multi-tenant enforcement in data layer
- Audit logging and analytics
