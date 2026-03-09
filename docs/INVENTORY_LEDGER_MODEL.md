# Inventory Ledger Model

**Phase:** 2
**Status:** IMPLEMENTED — migration staged, not yet applied to remote DB

---

## Overview

The inventory ledger introduces an immutable, append-only record of every quantity change in the warehouse. Two new tables back this model:

| Table | Role |
|-------|------|
| `inventory_movements` | Immutable ledger records — one row per event, never updated or deleted |
| `inventory_balances` | Derived running totals — updated in-process on every movement write |

`inventory_items` is preserved unchanged. Its `qty` column is kept in sync with `inventory_balances.on_hand` so all existing UI reads continue to work without modification.

---

## Tables

### `inventory_movements`

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | `MOV-{timestamp}-{random}` |
| `tenant_id` | text FK → tenants | Multi-tenant isolation |
| `inventory_item_id` | text FK → inventory_items | The item this event concerns |
| `movement_type` | text | See movement types below |
| `qty_delta` | integer | Signed: positive = increase, negative = decrease, zero = location-only |
| `from_location` | text | Source location code (nullable) |
| `to_location` | text | Destination location code (nullable) |
| `reference_id` | text | FK to the triggering entity (orderId, returnId, taskId) |
| `reference_type` | text | `'order'` \| `'return'` \| `'task'` \| `'manual'` \| `'opening_balance'` |
| `actor_id` | text | `users.id` of the person who triggered this (null in dev-bypass) |
| `note` | text | Free-text description |
| `created_at` | timestamptz | Immutable creation timestamp |

### `inventory_balances`

| Column | Type | Description |
|--------|------|-------------|
| `tenant_id` | text PK (composite) | Multi-tenant isolation |
| `inventory_item_id` | text PK (composite) | One row per item |
| `on_hand` | integer | Total units physically in the warehouse |
| `reserved` | integer | Units allocated to unfulfilled orders |
| `available` | integer (generated) | `on_hand - reserved` — computed always |
| `updated_at` | timestamptz | Last balance update time |

---

## Movement Types

| Type | Affects | Description |
|------|---------|-------------|
| `receive` | on_hand ↑ | Inbound receipt from supplier |
| `putaway` | location only | Move from staging → storage (no qty change) |
| `transfer` | location only | Internal location transfer |
| `reserve` | reserved ↑ | Allocate units for an order |
| `unreserve` | reserved ↓ | Release reservation (order cancelled/modified) |
| `pick` | on_hand ↓ | Remove from storage for fulfillment |
| `pack` | location only | Associate with pack task |
| `ship` | on_hand ↓ | Units leave the warehouse |
| `return_restock` | on_hand ↑ | Returned item back to sellable stock |
| `return_scrap` | on_hand ↓ | Returned item disposed or scrapped |
| `adjust_increase` | on_hand ↑ | Manual positive adjustment |
| `adjust_decrease` | on_hand ↓ | Manual negative adjustment |

---

## Balance Derivation Rules

```
on_hand  += qty_delta  for: receive, return_restock, adjust_increase, pick*, ship*, return_scrap*, adjust_decrease*
reserved += qty_delta  for: reserve, unreserve*

* qty_delta is stored negative for decrease operations
```

`available` is always `on_hand - reserved` (PostgreSQL generated column, never set directly).

---

## Backward Compatibility

`inventory_items.qty` is mirrored from `inventory_balances.on_hand` after every movement that changes `on_hand`. All existing UI code reads `inventory_items` via the anon key REST path — no changes required in any screen, provider, or type definition.

The ledger is entirely opt-in from the UI's perspective. The UI can be enhanced later to display movement history or balance breakdowns, but nothing is required for Phase 2.

---

## Opening Balances

When migration `20260309000001` is applied, the following happens automatically:

1. An `inventory_balances` row is seeded for every existing `inventory_items` row
   (`on_hand = current qty`, `reserved = 0`)
2. One `adjust_increase` movement is inserted per item with `qty > 0`
   (reference_type = `'opening_balance'`)

This ensures the ledger is consistent with pre-existing data from day one.

---

## Service Layer

All quantity changes go through `lib/inventory/movementService.ts` (server-side only):

```typescript
// Create a movement + update balances + sync inventory_items.qty
createInventoryMovement(db, { tenantId, inventoryItemId, movementType, qty, ...opts })

// Query current balances
getInventoryBalance(db, tenantId, inventoryItemId) → InventoryBalance | null

// Validate feasibility before writing
validateInventoryMovement(db, params) → string | null  // null = valid

// Replay all movements to rebuild balance (for repair/backfill)
rebuildInventoryBalanceForItem(db, tenantId, inventoryItemId)
```

---

## What Is NOT In Phase 2

| Feature | Status |
|---------|--------|
| Barcode/UOM tracking | Deferred — Phase 3 |
| Smart Receiving integration | Deferred — separate initiative |
| Reserve/unreserve wired to order fulfillment | Deferred — Phase 3 |
| Movement history UI | Deferred — Phase 3 |
| Full ledger audit queries / reports | Deferred — Phase 3 |
| RLS on `inventory_movements` / `inventory_balances` | Deferred — Phase 2 RLS pass |
