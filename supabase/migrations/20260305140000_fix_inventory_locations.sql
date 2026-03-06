-- Fix inventory_items.location codes to match storage_locations.code format
-- and align client names with the clients table.
-- Also seed richer tenant-1 inventory covering all four WMS clients.

-- ── Fix existing tenant-1 items ───────────────────────────────────────────────
UPDATE public.inventory_items
SET location = 'R-01-A-1-1', client = 'TechCorp Electronics'
WHERE id = 'INV-001';

UPDATE public.inventory_items
SET location = 'R-01-A-1-2', client = 'TechCorp Electronics'
WHERE id = 'INV-002';

-- ── Add richer tenant-1 inventory spread across all zones ────────────────────
-- Using ON CONFLICT DO NOTHING so re-running is safe.
INSERT INTO public.inventory_items
  (id, tenant_id, sku, name, location, status, qty, min_stock, client)
VALUES
  -- Zone Z-01 / Rack R-02 — TechCorp Electronics (CLT-101)
  ('INV-T1-001', 'tenant-1', 'SKU-1003', 'Bluetooth Speaker',
   'R-02-B-1-1', 'available',   280, 200, 'TechCorp Electronics'),

  -- Zone Z-01 / Rack R-03 — FitLife Athletics (CLT-102)
  ('INV-T1-002', 'tenant-1', 'SKU-3001', 'Yoga Mat (Blue)',
   'R-03-A-1-1', 'available',   320, 150, 'FitLife Athletics'),
  ('INV-T1-003', 'tenant-1', 'SKU-3044', 'Resistance Bands Set',
   'R-03-A-1-2', 'available',   175, 100, 'FitLife Athletics'),

  -- Zone Z-01 / Rack R-03 — BeanRoasters Coffee (CLT-103, seq 13+)
  ('INV-T1-004', 'tenant-1', 'SKU-2001', 'Organic Coffee Beans',
   'R-03-A-2-1', 'available',   850, 500, 'BeanRoasters Coffee'),

  -- Zone Z-01 / Rack R-04 — HomeGoods Plus (CLT-104, seq 1-30)
  ('INV-T1-005', 'tenant-1', 'SKU-4001', 'Storage Bins (6-pack)',
   'R-04-B-1-1', 'available',   240, 100, 'HomeGoods Plus'),
  ('INV-T1-006', 'tenant-1', 'SKU-4002', 'Kitchen Organizer Set',
   'R-04-B-1-2', 'available',    88,  75, 'HomeGoods Plus'),
  ('INV-T1-007', 'tenant-1', 'SKU-4003', 'Bamboo Shelf Dividers',
   'R-04-B-2-1', 'reserved',    155,  50, 'HomeGoods Plus'),

  -- Zone Z-01 / Rack R-04 — BeanRoasters Coffee (CLT-103, seq 31+)
  ('INV-T1-008', 'tenant-1', 'SKU-2002', 'Espresso Machine',
   'R-04-B-4-1', 'quarantined',  15,  20, 'BeanRoasters Coffee'),

  -- Zone Z-02 / Rack FP-01 — TechCorp Electronics fast movers
  ('INV-T1-009', 'tenant-1', 'SKU-1001', 'Wireless Earbuds (Pick)',
   'FP-01-A-1-1', 'available',   50,  30, 'TechCorp Electronics'),
  ('INV-T1-010', 'tenant-1', 'SKU-1002', 'Smart Watch (Pick)',
   'FP-01-A-1-2', 'available',   22,  15, 'TechCorp Electronics'),

  -- Zone Z-02 / Rack FP-02 — BeanRoasters Coffee fast movers
  ('INV-T1-011', 'tenant-1', 'SKU-2001', 'Organic Coffee Beans (Pick)',
   'FP-02-B-1-1', 'available',  120,  50, 'BeanRoasters Coffee'),

  -- Zone Z-03 / Rack OV-01 — BeanRoasters overflow
  ('INV-T1-012', 'tenant-1', 'SKU-2001', 'Organic Coffee Beans (Overflow)',
   'OV-01-A-1-1', 'available',  600, 200, 'BeanRoasters Coffee'),

  -- Zone Z-04 / Rack RT-01 — Returns (no client, pending receive)
  ('INV-T1-013', 'tenant-1', 'SKU-1001', 'Wireless Earbuds (Return)',
   'RT-01-A-1-1', 'pending_receive', 3,   0, 'TechCorp Electronics')

ON CONFLICT (id) DO NOTHING;
