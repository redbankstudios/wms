-- ────────────────────────────────────────────────────────────────────────────
-- Phase 6: Pick / Reserve / Fulfillment Ledger Integration
-- Adds inventory_reservations table for outbound stock-control traceability.
--
-- Design notes:
--   • inventory_reservations: one row per (order_line × inventory_item) allocation.
--     Provides a durable audit trail of what was reserved, how much was picked,
--     and the current lifecycle state.
--   • inventory_balances.reserved: derived state — updated by the movement
--     service whenever a reserve or unreserve movement is written.
--   • order_line_id is nullable because the current UI does not guarantee that
--     every create-order flow persists order_lines. When lines are present the
--     FK is set; when they are absent the reservation is order-level only.
--   • RLS is intentionally DISABLED — consistent with all earlier tables in
--     this project's development phase.
-- ────────────────────────────────────────────────────────────────────────────

-- inventory_reservations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                  text        PRIMARY KEY,
  tenant_id           text        NOT NULL REFERENCES tenants(id),
  order_id            text        NOT NULL REFERENCES orders(id),
  -- Nullable: not every UI flow persists order_lines with a durable id
  order_line_id       text        REFERENCES order_lines(id),
  inventory_item_id   text        NOT NULL REFERENCES inventory_items(id),
  sku                 text        NOT NULL,

  reserved_qty        integer     NOT NULL CHECK (reserved_qty > 0),
  picked_qty          integer     NOT NULL DEFAULT 0 CHECK (picked_qty >= 0),

  -- Lifecycle:
  --   active           → reservation is live; inventory is allocated
  --   partially_picked → some qty has been picked but not all
  --   fulfilled        → all qty picked (or shipped without a pick step)
  --   released         → reservation cancelled and inventory returned to available
  --   cancelled        → order cancelled before any picking started
  status              text        NOT NULL DEFAULT 'active'
                        CHECK (status IN (
                          'active',
                          'partially_picked',
                          'fulfilled',
                          'released',
                          'cancelled'
                        )),

  -- Reference to the reserve ledger movement that created this record
  movement_id         text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Useful indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS inv_res_tenant_idx
  ON inventory_reservations (tenant_id);

CREATE INDEX IF NOT EXISTS inv_res_order_idx
  ON inventory_reservations (order_id);

CREATE INDEX IF NOT EXISTS inv_res_item_idx
  ON inventory_reservations (inventory_item_id);

CREATE INDEX IF NOT EXISTS inv_res_status_idx
  ON inventory_reservations (status);

CREATE INDEX IF NOT EXISTS inv_res_order_item_idx
  ON inventory_reservations (order_id, inventory_item_id);

-- RLS disabled for development phase ─────────────────────────────────────────

ALTER TABLE inventory_reservations DISABLE ROW LEVEL SECURITY;
