# Phase 2: Inventory Ledger Foundation — Implementation Summary

**Date:** 2026-03-09
**Status:** COMPLETE — ledger tables + service layer wired into mutation API

---

## What Was Implemented

### A. `inventory_movements` table (immutable ledger)

Migration: `supabase/migrations/20260309000001_add_inventory_ledger.sql`

Append-only record of every inventory quantity change. One row per event. Never updated or deleted. Columns: `id`, `tenant_id`, `inventory_item_id`, `movement_type`, `qty_delta` (signed), `from_location`, `to_location`, `reference_id`, `reference_type`, `actor_id`, `note`, `created_at`.

Movement types: `receive` | `putaway` | `transfer` | `reserve` | `unreserve` | `pick` | `pack` | `ship` | `return_restock` | `return_scrap` | `adjust_increase` | `adjust_decrease`

### B. `inventory_balances` table (derived state)

Same migration. One row per `(tenant_id, inventory_item_id)`. Columns: `on_hand`, `reserved`, `available` (PostgreSQL generated column: `on_hand - reserved`), `updated_at`.

Backfill: migration seeds one balance row per existing `inventory_items` row (`on_hand = current qty`, `reserved = 0`) and inserts an opening `adjust_increase` movement per item.

### C. Movement service layer

File: `lib/inventory/movementService.ts`

Server-side only. Exported functions:

| Function | Description |
|----------|-------------|
| `createInventoryMovement(db, params)` | Insert movement + update balances + sync `inventory_items.qty` |
| `getInventoryBalance(db, tenantId, itemId)` | Read current `{ on_hand, reserved, available }` |
| `validateInventoryMovement(db, params)` | Pre-flight check — returns error string or null |
| `rebuildInventoryBalanceForItem(db, tenantId, itemId)` | Replay movements to repair/backfill balances |

### D. API route integration

File: `app/api/inventory/route.ts`

All three handlers wired to the ledger:

| Endpoint | Ledger action |
|----------|--------------|
| `POST /api/inventory` | Creates item → writes `adjust_increase` opening movement if `qty > 0` |
| `PATCH /api/inventory` (qty change) | Writes `adjust_increase` or `adjust_decrease`; service handles `inventory_items.qty` sync |
| `PATCH /api/inventory` (location-only) | Writes `transfer` movement (zero qty_delta) |
| `DELETE /api/inventory` | Writes `adjust_decrease` write-off before row deletion |

Ledger writes are best-effort: if `createInventoryMovement` throws (e.g. table not yet applied), a console error is logged but the API response still succeeds. This prevents ledger bootstrap from breaking the mutation path.

### E. Backward compatibility

`inventory_items.qty` is mirrored from `inventory_balances.on_hand` after every movement that changes `on_hand`. No changes to UI components, data providers, types, or REST read paths.

### F. Documentation

| File | Contents |
|------|----------|
| `docs/INVENTORY_LEDGER_MODEL.md` | Schema reference, movement types, balance rules, service API |
| `docs/LEDGER_TRANSITION_PLAN.md` | Phase 2 → 3 roadmap, deferred work, migration checklist, rollback |
| `docs/PHASE_2_INVENTORY_LEDGER_FOUNDATION.md` | This file — implementation summary |

---

## Files Changed

**New:**
- `supabase/migrations/20260309000001_add_inventory_ledger.sql`
- `lib/inventory/movementService.ts`
- `docs/INVENTORY_LEDGER_MODEL.md`
- `docs/LEDGER_TRANSITION_PLAN.md`
- `docs/PHASE_2_INVENTORY_LEDGER_FOUNDATION.md`

**Modified:**
- `app/api/inventory/route.ts` — ledger wired into POST, PATCH, DELETE

---

## Manual Steps Required

1. **Apply migration to remote DB:**
   ```
   supabase db push
   ```
   This creates `inventory_movements` + `inventory_balances` and seeds opening balances from current `inventory_items` data.

2. **Verify backfill:**
   ```sql
   select count(*) as balances from inventory_balances;
   select count(*) as items from inventory_items;
   -- Both should be equal
   ```

3. **Set `SUPABASE_SERVICE_ROLE_KEY`** (required for admin client used by movement service):
   - `.env.local` for local development
   - Vercel environment variables for production

---

## What Is NOT Included in Phase 2

- Return disposition wired to ledger (deferred — Phase 3)
- Inbound receiving wired to ledger (deferred — Phase 3)
- Reserve/unreserve lifecycle tied to order fulfillment (deferred — Phase 3)
- Movement history UI (deferred — Phase 3)
- RLS on ledger tables (deferred — Phase 2 RLS pass)
- Barcode/UOM tracking (deferred — Phase 3)

---

## Remaining Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration not yet applied to remote | Ledger writes silently fail (best-effort) | Apply with `supabase db push` |
| `SUPABASE_SERVICE_ROLE_KEY` not set | Admin client throws, API mutations fail | Set in env before using in production |
| Opening balance may drift from `inventory_items.qty` if future direct DB edits bypass service | Balance/item mismatch | Use `rebuildInventoryBalanceForItem` for repair |
