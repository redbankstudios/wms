# Repository Map

## Top-level layout
- `app/`: Next.js app routes/layouts.
- `components/`: UI primitives, layout wrappers, and all feature screens.
- `config/`: role-navigation config.
- `context/`: app-wide React contexts (theme/demo/messages).
- `data/`: provider abstraction + concrete providers.
- `hooks/`: reusable React hooks.
- `lib/`: shared helpers (Supabase REST wrapper, auto-assignment math, utility functions).
- `mock/`: static mock datasets used by mock provider/services.
- `services/`: mock services + task assignment algorithm.
- `supabase/`: migrations, seed, and local Supabase config.
- `types/`: central TypeScript domain models.
- `docs/`: discovery and architecture documentation.

## Key directories requested

### components
- `components/ui/`: base UI components (`button`, `card`, `table`, `dialog`, etc.).
- `components/layout/`: top bar + sidebar navigation.
- `components/screens/`: business modules:
  - Warehouse: `dashboard`, `inbound`, `storage`, `inventory`, `orders`, `tasks`, `returns`, `employees`
  - Dispatch: `dispatcher`, `routes`, `dispatch-queue`, `drivers`, `fleet`
  - Mobile: `mobile-worker`, `mobile-driver`, maps
  - Tenant/client: `tenants`, `billing`, `client-portal`, `b2b-*`

### screens
- Screen components are data orchestration points.
- They call provider methods and maintain local UI state.
- Most domain actions originate here.

### services
- Mostly mock/in-memory services (`tenantService`, `orderService`, etc.).
- Core logic module: `taskAssignmentService.ts`.

### hooks
- `hooks/use-mobile.ts`: viewport mobile detection helper.

### database migrations
- `supabase/migrations/*.sql`: full relational schema + seed/fix evolution.
- Covers tenants, orders, tasks, inventory, routes, returns, storage, inbound, drivers, zones, products, events, etc.

### API routes
- No `app/api` route handlers found.
- API surface is Supabase REST table endpoints consumed via provider.

### utilities
- `lib/supabaseRest.ts`: low-level REST GET/POST/PATCH/DELETE helpers.
- `lib/autoAssign.ts`: dispatch assignment algorithm.
- `lib/utils.ts`: class merge helper.

### types
- `types/index.ts`: canonical domain interfaces and enums.
- Includes entities for tenants, users, products, inventory, tasks, orders, routes/stops, returns, storage, inbound hierarchy, events, messaging, billing, and B2B models.

## Route map
- `/`: main operations console (`app/page.tsx`).
- `/pricing`: pricing/plan UI (`app/pricing/page.tsx`).

## Provider map
- `data/providers/IDataProvider.ts`: domain contracts.
- `data/providers/supabase/index.ts`: PostgREST-backed implementation.
- `data/providers/mock/index.ts`: mock/in-memory fallback.

## Observed organization pattern
- Contract-first data layer (`IDataProvider`) keeps screens mostly backend-agnostic.
- Domain logic mostly UI-driven; persistence orchestration lives in provider.
- No server-side orchestration boundary inside this repo.
