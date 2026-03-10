-- ────────────────────────────────────────────────────────────────────────────
-- Seed: Pending Orders for Phase 6 fulfillment testing
--
-- Creates 2 pending orders for tenant-1 with real clients and real inventory
-- item references so the allocate / pick / release flow can be exercised end-to-end.
--
-- Clients used (from clients table):
--   TechCorp Electronics  (CLT-101)
--   FitLife Athletics     (CLT-102)
--
-- Inventory items referenced (all available, tenant-1):
--   INV-001   SKU-1001  Wireless Earbuds        on_hand ~450  available ~450
--   INV-T1-001 SKU-1003 Bluetooth Speaker       on_hand ~280  available ~280
--   INV-T1-002 SKU-3001 Yoga Mat (Blue)         on_hand ~320  available ~320
--   INV-T1-003 SKU-3044 Resistance Bands Set    on_hand ~175  available ~175
-- ────────────────────────────────────────────────────────────────────────────

-- Remove any stale test orders from previous runs (idempotent)
DELETE FROM public.order_lines WHERE order_id IN ('ORD-TEST-001', 'ORD-TEST-002');
DELETE FROM public.orders      WHERE id       IN ('ORD-TEST-001', 'ORD-TEST-002');

-- Order 1 — TechCorp Electronics, 2 lines (electronics)
INSERT INTO public.orders
  (id, tenant_id, order_number, status, priority, customer, destination, created_at, due_date, items)
VALUES
  (
    'ORD-TEST-001', 'tenant-1', 'PO-2026-001', 'pending', 'high',
    'TechCorp Electronics',
    'San Francisco, CA',
    '2026-03-09T10:00:00Z',
    '2026-03-12T17:00:00Z',
    10
  );

INSERT INTO public.order_lines (id, order_id, sku, name, quantity, location, status)
VALUES
  ('OL-TEST-001-A', 'ORD-TEST-001', 'SKU-1001', 'Wireless Earbuds',  5, 'R-01-A-1-1', 'pending'),
  ('OL-TEST-001-B', 'ORD-TEST-001', 'SKU-1003', 'Bluetooth Speaker', 5, 'R-02-B-1-1', 'pending');

-- Order 2 — FitLife Athletics, 2 lines (fitness)
INSERT INTO public.orders
  (id, tenant_id, order_number, status, priority, customer, destination, created_at, due_date, items)
VALUES
  (
    'ORD-TEST-002', 'tenant-1', 'PO-2026-002', 'pending', 'normal',
    'FitLife Athletics',
    'Austin, TX',
    '2026-03-09T11:00:00Z',
    '2026-03-14T17:00:00Z',
    12
  );

INSERT INTO public.order_lines (id, order_id, sku, name, quantity, location, status)
VALUES
  ('OL-TEST-002-A', 'ORD-TEST-002', 'SKU-3001', 'Yoga Mat (Blue)',       8, 'R-03-A-1-1', 'pending'),
  ('OL-TEST-002-B', 'ORD-TEST-002', 'SKU-3044', 'Resistance Bands Set', 4, 'R-03-A-1-2', 'pending');
