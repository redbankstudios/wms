-- ─── Phase 5: Exception Resolution + Unknown Barcode Learning ────────────────
-- Extends receiving_exceptions with resolution lifecycle fields.
-- Adds scan_id linkage and exception_id back-link on receiving_scans.

-- ── Extend receiving_exceptions ───────────────────────────────────────────────

ALTER TABLE receiving_exceptions
  ADD COLUMN IF NOT EXISTS scan_id               text,          -- scan that triggered this exception
  ADD COLUMN IF NOT EXISTS resolved_product_id   text,          -- product chosen during resolution
  ADD COLUMN IF NOT EXISTS resolved_sku          text,          -- SKU chosen during resolution
  ADD COLUMN IF NOT EXISTS resolution_action     text           -- how it was resolved
    CHECK (resolution_action IN (
      'barcode_saved',   -- unknown barcode registered into product_barcodes
      'stock_accepted',  -- overage / shortage accepted as-is
      'stock_rejected',  -- overage / shortage rejected / counted back
      'dismissed',       -- exception dismissed (operator error etc.)
      'reposted'         -- scan was re-posted to ledger after resolution
    )),
  ADD COLUMN IF NOT EXISTS resolution_notes      text,          -- supervisor free text
  ADD COLUMN IF NOT EXISTS approved_by_user_id   text,
  ADD COLUMN IF NOT EXISTS rejected_by_user_id   text;

-- ── Back-link: receiving_scans → exception ────────────────────────────────────

ALTER TABLE receiving_scans
  ADD COLUMN IF NOT EXISTS exception_id text;   -- set when the scan raised an exception

-- ── Index for exception lookup by scan ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS receiving_exceptions_scan_idx
  ON receiving_exceptions (tenant_id, scan_id);

CREATE INDEX IF NOT EXISTS receiving_exceptions_type_status_idx
  ON receiving_exceptions (tenant_id, exception_type, status);
