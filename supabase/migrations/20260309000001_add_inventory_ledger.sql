-- =============================================================================
-- Phase 2: Inventory Ledger Foundation
-- Migration: 20260309000001_add_inventory_ledger.sql
-- =============================================================================
--
-- Adds two tables that form the inventory ledger:
--
--   inventory_movements  — immutable append-only record of every quantity change
--   inventory_balances   — derived running totals (on_hand, reserved, available)
--
-- inventory_items is PRESERVED as-is. Its qty column is kept in sync with
-- inventory_balances.on_hand so that all existing UI reads continue to work.
-- This migration is safe to apply at any time — it is purely additive.
-- =============================================================================

-- ── inventory_movements ──────────────────────────────────────────────────────
-- Immutable ledger. One row per quantity change event. Never updated or deleted.

create table if not exists public.inventory_movements (
  id               text        primary key,
  tenant_id        text        not null references public.tenants(id) on delete cascade,
  inventory_item_id text       not null references public.inventory_items(id) on delete cascade,

  -- Movement type determines which balance quantity is affected.
  -- Values: receive | putaway | transfer | reserve | unreserve |
  --         pick | pack | ship | return_restock | return_scrap |
  --         adjust_increase | adjust_decrease
  movement_type    text        not null,

  -- Signed quantity delta applied to the relevant balance:
  --   positive  → increase (on_hand or reserved depending on type)
  --   negative  → decrease
  --   zero      → location-only move (putaway, transfer, pack)
  qty_delta        integer     not null,

  from_location    text,
  to_location      text,

  -- Flexible foreign reference for traceability
  reference_id     text,       -- orderId, returnId, taskId, etc.
  reference_type   text,       -- 'order' | 'return' | 'task' | 'manual'

  actor_id         text,       -- public.users.id of the person who triggered this
  note             text,

  created_at       timestamptz not null default now()
);

create index if not exists inventory_movements_tenant_item_idx
  on public.inventory_movements(tenant_id, inventory_item_id);

create index if not exists inventory_movements_item_created_idx
  on public.inventory_movements(inventory_item_id, created_at);

create index if not exists inventory_movements_reference_idx
  on public.inventory_movements(reference_id, reference_type)
  where reference_id is not null;

alter table public.inventory_movements disable row level security;

-- ── inventory_balances ───────────────────────────────────────────────────────
-- Derived state. One row per (tenant_id, inventory_item_id).
-- Updated in-process whenever a movement is written (no triggers required).
-- available = on_hand - reserved (generated column, always consistent).

create table if not exists public.inventory_balances (
  tenant_id          text        not null references public.tenants(id) on delete cascade,
  inventory_item_id  text        not null references public.inventory_items(id) on delete cascade,

  on_hand            integer     not null default 0 check (on_hand >= 0),
  reserved           integer     not null default 0 check (reserved >= 0),
  available          integer     generated always as (on_hand - reserved) stored,

  updated_at         timestamptz not null default now(),

  primary key (tenant_id, inventory_item_id)
);

create index if not exists inventory_balances_tenant_idx
  on public.inventory_balances(tenant_id);

alter table public.inventory_balances disable row level security;

-- =============================================================================
-- Backfill: seed inventory_balances from current inventory_items.qty
-- This ensures existing items have a balance row from day one.
-- on_hand = current qty, reserved = 0 (no reservation tracking exists yet).
-- =============================================================================

insert into public.inventory_balances (tenant_id, inventory_item_id, on_hand, reserved, updated_at)
select
  tenant_id,
  id as inventory_item_id,
  greatest(qty, 0) as on_hand,
  0               as reserved,
  now()           as updated_at
from public.inventory_items
on conflict (tenant_id, inventory_item_id) do update
  set on_hand    = excluded.on_hand,
      updated_at = excluded.updated_at;

-- =============================================================================
-- Seed opening movements: one adjust_increase per existing item
-- These represent the "opening balance" snapshot so the ledger is consistent.
-- =============================================================================

insert into public.inventory_movements (
  id, tenant_id, inventory_item_id, movement_type, qty_delta,
  from_location, to_location, reference_id, reference_type, actor_id, note, created_at
)
select
  'MOV-OPEN-' || id                         as id,
  tenant_id,
  id                                         as inventory_item_id,
  'adjust_increase'                          as movement_type,
  greatest(qty, 0)                           as qty_delta,
  null                                       as from_location,
  location                                   as to_location,
  null                                       as reference_id,
  'opening_balance'                          as reference_type,
  null                                       as actor_id,
  'Opening balance seeded from inventory_items.qty on ledger init' as note,
  now()                                      as created_at
from public.inventory_items
where qty > 0
on conflict (id) do nothing;
