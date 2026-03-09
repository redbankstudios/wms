# Ledger Transition Plan

**Phase:** 2 → 3
**Status:** Phase 2 baseline established — transition in progress

---

## Goal

Replace direct `inventory_items.qty` mutation (the current model) with the ledger as the single source of truth for all inventory quantity state. The transition is incremental — `inventory_items.qty` continues to work throughout.

---

## Phase 2 (Current — COMPLETE)

### What was done

- `inventory_movements` table created (immutable ledger)
- `inventory_balances` table created (derived balances)
- `lib/inventory/movementService.ts` — server-side movement write API
- `app/api/inventory/route.ts` — wired:
  - POST: creates item + writes `adjust_increase` opening movement
  - PATCH qty: writes `adjust_increase` or `adjust_decrease`, delegates qty update to service
  - PATCH location-only: writes `transfer` movement
  - DELETE: writes `adjust_decrease` write-off movement before row removal

### Compatibility guarantee

`inventory_items.qty` is kept in sync by the movement service. Every movement that changes `on_hand` also updates `inventory_items.qty`. All UI reads work unchanged.

---

## Phase 3 — Deferred Work

### 3A: Wiring remaining mutation paths

| Path | Current | Target |
|------|---------|--------|
| Return disposition (restocked) | `inventory_items` not updated | Write `return_restock` movement |
| Return disposition (scrapped/disposed) | no qty change | Write `return_scrap` movement |
| Inbound receiving | no qty tracking | Write `receive` + optional `putaway` |
| Order fulfillment | no qty change in WMS | Write `reserve` → `pick` → `ship` |

### 3B: Reserve/unreserve lifecycle

Orders place a reservation when status moves to `packed`. The reservation is released (unreserve) on cancellation or converted to a pick on shipment. Requires:
1. Add `reserve` movement when order → `packed`
2. Add `unreserve` movement when order → `cancelled`
3. Add `pick` movement when order → `shipped`

### 3C: Movement history UI

A timeline / ledger view per inventory item showing every movement with actor, timestamp, reference, and running balance. This is read-only and requires no schema changes.

### 3D: RLS on ledger tables

When RLS is enabled on `inventory_movements` and `inventory_balances`, the same `current_user_tenant_id()` policy pattern applies as other tables. Apply in Batch 3 of the RLS rollout.

### 3E: Ledger consistency checks

A periodic server-side job or on-demand admin tool that:
1. Queries `inventory_balances.on_hand` for each item
2. Verifies it equals the sum of all signed `qty_delta` from movements of on_hand types
3. Verifies `inventory_items.qty` matches `inventory_balances.on_hand`
4. Reports discrepancies — does not auto-correct

---

## Migration Checklist Before Going Live

- [ ] Apply `20260309000001_add_inventory_ledger.sql` to remote DB
- [ ] Verify backfill: `select count(*) from inventory_balances` = `select count(*) from inventory_items`
- [ ] Verify opening movements: `select count(*) from inventory_movements where reference_type = 'opening_balance'`
- [ ] Test POST /api/inventory → verify movement row inserted
- [ ] Test PATCH /api/inventory (qty change) → verify movement + balance updated
- [ ] Test DELETE /api/inventory → verify write-off movement + item deleted
- [ ] Verify `inventory_items.qty` still matches UI display after each test

---

## Rollback Plan

The ledger tables are additive. If issues arise after applying the migration:

1. `inventory_items` is unchanged — all reads continue to work
2. The movement service writes can be disabled by removing the `createInventoryMovement` calls from `app/api/inventory/route.ts`
3. The ledger tables themselves do not need to be dropped — they can be left empty

To remove the ledger entirely:
```sql
drop table if exists public.inventory_movements;
drop table if exists public.inventory_balances;
```
