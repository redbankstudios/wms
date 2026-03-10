-- ────────────────────────────────────────────────────────────────────────────
-- Phase 7: Pack / Ship / Dispatch Integration
-- Extends the shipments table with lifecycle metadata fields needed to track
-- pack confirmation and shipment finalization events.
--
-- Design notes:
--   • packed_at / packed_by_user_id: set when a packer confirms pack (no stock change).
--   • shipped_at / shipped_by_user_id: set when inventory impact is finalized.
--   • shipment_status is a finer-grained status field alongside the existing
--     `status` column. The original `status` column remains for legacy reads.
--   • RLS intentionally DISABLED — consistent with all earlier tables.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS packed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS packed_by_user_id   text,
  ADD COLUMN IF NOT EXISTS shipped_at          timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_by_user_id  text,
  ADD COLUMN IF NOT EXISTS shipment_status     text NOT NULL DEFAULT 'pending'
    CHECK (shipment_status IN (
      'pending',
      'pack_confirmed',
      'shipped',
      'in_transit',
      'delivered',
      'cancelled'
    ));

-- Index to quickly find all shipments in a given lifecycle state
CREATE INDEX IF NOT EXISTS shipments_shipment_status_idx
  ON public.shipments (shipment_status);

-- Index to support cancel queries against tenant + order
CREATE INDEX IF NOT EXISTS shipments_tenant_order_idx
  ON public.shipments (tenant_id, order_id);

-- RLS disabled for development phase
ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;
