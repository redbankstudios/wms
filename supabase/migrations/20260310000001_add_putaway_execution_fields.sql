-- =============================================================================
-- Phase 9: Directed Putaway — execution metadata on tasks
-- Migration: 20260310000001_add_putaway_execution_fields.sql
-- =============================================================================
--
-- Extends the tasks table with fields needed to track putaway work:
--   - inbound_shipment_id  links task to the source shipment
--   - receiving_session_id links task to the session that generated it
--   - inventory_item_id    the item being moved
--   - sku                  human-readable SKU for display
--   - source_location      dock/staging code where inventory landed (e.g. STAGING-SHIP-001)
--   - destination_location final rack/bin code (may be null until assigned)
--   - qty                  pallets/units to be moved
--   - completed_at         timestamp when putaway was confirmed
--   - completed_by_user_id who confirmed the putaway
--
-- Fully additive. Does not touch existing rows or columns.
-- =============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS inbound_shipment_id   text        NULL,
  ADD COLUMN IF NOT EXISTS receiving_session_id  text        NULL,
  ADD COLUMN IF NOT EXISTS inventory_item_id     text        NULL,
  ADD COLUMN IF NOT EXISTS sku                   text        NULL,
  ADD COLUMN IF NOT EXISTS source_location       text        NULL,
  ADD COLUMN IF NOT EXISTS destination_location  text        NULL,
  ADD COLUMN IF NOT EXISTS qty                   integer     NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at          timestamptz NULL,
  ADD COLUMN IF NOT EXISTS completed_by_user_id  text        NULL;

-- Indexes for putaway query patterns
CREATE INDEX IF NOT EXISTS tasks_inbound_shipment_idx
  ON public.tasks(tenant_id, inbound_shipment_id)
  WHERE inbound_shipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_receiving_session_idx
  ON public.tasks(tenant_id, receiving_session_id)
  WHERE receiving_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_inventory_item_idx
  ON public.tasks(tenant_id, inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;
