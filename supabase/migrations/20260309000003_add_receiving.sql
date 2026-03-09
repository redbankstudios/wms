-- ─── Phase 4: Smart Receiving Core ───────────────────────────────────────────
-- Three tables: receiving_sessions, receiving_scans, receiving_exceptions
-- All use text PKs (consistent with rest of schema), RLS disabled (dev phase).

-- ── receiving_sessions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receiving_sessions (
  id                  text PRIMARY KEY,
  tenant_id           text NOT NULL REFERENCES tenants(id),
  inbound_shipment_id text NOT NULL REFERENCES inbound_shipments(id),
  operator_user_id    text,          -- FK to users.id (nullable — dev bypass)
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'paused', 'completed', 'cancelled')),
  started_at          timestamptz NOT NULL DEFAULT now(),
  closed_at           timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE receiving_sessions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS receiving_sessions_tenant_idx
  ON receiving_sessions (tenant_id, inbound_shipment_id);

-- ── receiving_scans ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receiving_scans (
  id                  text PRIMARY KEY,
  tenant_id           text NOT NULL REFERENCES tenants(id),
  session_id          text NOT NULL REFERENCES receiving_sessions(id),
  inbound_shipment_id text NOT NULL REFERENCES inbound_shipments(id),
  barcode             text,          -- raw scan string (null if entered by SKU)
  sku                 text,          -- resolved or directly entered
  product_id          text,          -- resolved from barcode (null if unknown)
  inventory_item_id   text,          -- resolved (null if not yet in stock)
  uom                 text,          -- resolved UOM code (e.g. "case")
  scanned_qty         integer NOT NULL DEFAULT 1,
  resolved_base_qty   integer,       -- base units after UOM conversion
  movement_id         text,          -- set after posting to ledger
  outcome             text NOT NULL DEFAULT 'unmatched'
                        CHECK (outcome IN ('matched', 'unmatched', 'exception', 'posted')),
  exception_code      text,          -- populated when outcome = 'exception'
  metadata            jsonb,         -- spare bag for extra context
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE receiving_scans DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS receiving_scans_session_idx
  ON receiving_scans (tenant_id, session_id);

CREATE INDEX IF NOT EXISTS receiving_scans_shipment_idx
  ON receiving_scans (tenant_id, inbound_shipment_id);

-- ── receiving_exceptions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receiving_exceptions (
  id                  text PRIMARY KEY,
  tenant_id           text NOT NULL REFERENCES tenants(id),
  session_id          text NOT NULL REFERENCES receiving_sessions(id),
  inbound_shipment_id text NOT NULL REFERENCES inbound_shipments(id),
  exception_type      text NOT NULL
                        CHECK (exception_type IN (
                          'unknown_barcode', 'sku_mismatch', 'overage',
                          'shortage', 'damaged', 'missing_item'
                        )),
  barcode             text,
  sku                 text,
  expected_qty        integer,
  received_qty        integer,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'approved', 'rejected', 'resolved')),
  notes               text,
  created_by_user_id  text,
  resolved_by_user_id text,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE receiving_exceptions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS receiving_exceptions_session_idx
  ON receiving_exceptions (tenant_id, session_id);
