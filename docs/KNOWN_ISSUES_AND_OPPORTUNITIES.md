# Known Issues And Opportunities

## Findings

| # | Finding | Impact | Location | Suggested fix | Effort |
|---|---|---|---|---|---|
| 1 | RLS is disabled on all tables created by migrations. | High security risk in multi-tenant environment; tenant data exposure possible if API keys or filters are misused. | `supabase/migrations/*init*.sql` (`alter table ... disable row level security`) | Enable RLS per table, create tenant-scoped policies, and enforce auth claims (`tenant_id`) in policies. | L |
| 2 | Access control is primarily client-side role gating. | Users can bypass UI checks if backend policies are weak; authorization not defense-in-depth. | `app/page.tsx`, `config/roleNavigation.ts` | Add server-side authorization boundaries (middleware/server actions/API route checks) plus DB RLS. | M-L |
| 3 | Supabase access uses anon key + direct REST from client for broad table operations. | Enlarged attack surface and hard-to-audit permissions; depends heavily on DB policy correctness. | `lib/supabaseRest.ts`, `data/providers/supabase/index.ts` | Move sensitive mutations/queries to server-side endpoints; keep client reads constrained. | M-L |
| 4 | Global search builds a large in-memory index by fetching many datasets at once. | Performance degradation and unnecessary data transfer, especially for large tenants. | `components/layout/topbar.tsx` (`buildIndex`) | Replace with server-side search endpoint or materialized search table with pagination and debounced queries. | M |
| 5 | Inconsistent provider usage: `OrderReports` imports `supabaseProvider` directly. | Breaks provider abstraction and can ignore `NEXT_PUBLIC_DATA_PROVIDER` setting. | `components/screens/order-reports.tsx` | Use `getProvider()` consistently. | S |
| 6 | Billing usage cards are static constants, not calculated from tenant usage tables. | Potentially misleading billing UI and trust risk for customers. | `components/screens/billing.tsx` (`USAGE_ITEMS`) | Replace with computed usage from stops/storage/tasks tables and/or billing events. | M |
| 7 | Reports dashboard is static mock data. | Decision-making risk from non-live analytics; product maturity gap. | `components/screens/reports.tsx` | Wire charts to provider-backed aggregated queries and add date-range filters against real data. | M |
| 8 | Silent error swallowing in key flows (`catch {}` comments “demo”). | Failures can go unnoticed; state divergence between UI and DB. | `components/screens/tasks.tsx`, `components/screens/mobile-driver.tsx`, `components/screens/orders.tsx`, `components/screens/client-portal.tsx` | Add user-visible error feedback, structured logging, and recovery/retry paths. | M |
| 9 | No shared validation layer for write payloads. | Bad data shape risk and inconsistent constraints between screens. | Multiple screen mutation handlers + provider mapping files. | Introduce schema validation (e.g., Zod) for form payloads and provider methods. | M |
| 10 | README is generic and not aligned with real architecture/workflows. | Slower onboarding and re-discovery cost for new engineers. | `README.md` | Replace with project-specific setup, architecture, env, and runbook sections. | S |
| 11 | Build config ignores lint errors during build. | Quality regressions can ship to production. | `next.config.ts` (`eslint.ignoreDuringBuilds: true`) | Re-enable lint in CI/build and split warning vs error gates intentionally. | S |
| 12 | Stray encoding artifact in Next config comments. | Low-level maintainability/readability issue and possible copy/paste confusion. | `next.config.ts` (garbled comment text) | Clean file encoding/comments and normalize formatting. | S |

## Additional gaps to verify
- Auth/session integration beyond `DemoContext`: `UNKNOWN`, verify any external auth layer not in repo.
- Webhook handlers (Shopify/integration endpoints): `UNKNOWN` in scanned files; table support exists (`events`) but handlers not found.
- CI pipeline config (`.github/workflows`): not found in repo.
