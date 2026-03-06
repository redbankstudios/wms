-- Align all three pallet-count sources so they tell a consistent story.
--
-- Ground truth: racks.used_capacity (seeded from storage_locations sums).
--   Rack totals (used / total):
--     R-01  95/100   R-02 100/100   R-03  40/100   R-04  80/100
--     R-05  85/ 90   R-06  70/ 90   R-07  78/ 80   R-08  18/ 20
--   Sum: 566 used / 680 total  → 83 % occupancy
--
-- warehouse_zones  — fix to match sum-of-racks per zone
--   Z-01 Reserve     R-01+R-02+R-03+R-04 = 315/400
--   Z-02 Forward Pick R-05+R-06          = 155/180
--   Z-03 Overflow    R-07               =  78/ 80
--   Z-04 Returns     R-08               =  18/ 20
--   Z-05 Staging     (no racks)         =   0/  0  (floor space only)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.warehouse_zones SET total_capacity = 400, used_capacity = 315 WHERE id = 'Z-01';
UPDATE public.warehouse_zones SET total_capacity = 180, used_capacity = 155 WHERE id = 'Z-02';
UPDATE public.warehouse_zones SET total_capacity =  80, used_capacity =  78 WHERE id = 'Z-03';
UPDATE public.warehouse_zones SET total_capacity =  20, used_capacity =  18 WHERE id = 'Z-04';
UPDATE public.warehouse_zones SET total_capacity =   0, used_capacity =   0 WHERE id = 'Z-05';

-- inventory_items — reseed qty (pallets) so sum = 566, matching rack used_capacity.
--
-- Distribution per zone / client:
--   Z-01 CLT-101 TechCorp   R-01(95) + R-02(100) = 195  → earbuds 95, watch 50, speaker 50
--   Z-01 CLT-102 FitLife    R-03 seq1-12 = 24            → yoga mat 14, resistance bands 10
--   Z-01 CLT-103 BeanRoast  R-03 seq13-20 = 16 + R-04 seq31-40 = 20 → coffee 16, espresso 20
--   Z-01 CLT-104 HomeGoods  R-04 seq1-30 = 60            → bins 30, kitchen 20, dividers 10
--   Z-02 CLT-101 TechCorp   FP-01(85) + FP-02 seq1-15+31-35 = 40 → earbuds pick 85, watch pick 40
--   Z-02 CLT-103 BeanRoast  FP-02 seq16-30 = 30          → coffee pick 30
--   Z-03 CLT-103 BeanRoast  OV-01(78)                   → coffee overflow 78
--   Z-04 returns            RT-01(18)                   → earbuds return 18
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.inventory_items SET
  qty          =  95,
  min_stock    =  80,
  product_units = 2280   -- 95 pallets × 24 units/pallet
WHERE id = 'INV-001';   -- Wireless Earbuds  (R-01, CLT-101)

UPDATE public.inventory_items SET
  qty          =  50,
  min_stock    =  40,
  product_units =  600   -- 50 × 12
WHERE id = 'INV-002';   -- Smart Watch  (R-02-B, CLT-101)

UPDATE public.inventory_items SET
  qty          =  50,
  min_stock    =  30,
  product_units =  300   -- 50 × 6
WHERE id = 'INV-T1-001'; -- Bluetooth Speaker  (R-02-B, CLT-101)

UPDATE public.inventory_items SET
  qty          =  14,
  min_stock    =  16,   -- intentional LOW STOCK alert
  product_units =  140   -- 14 × 10
WHERE id = 'INV-T1-002'; -- Yoga Mat  (R-03, CLT-102)

UPDATE public.inventory_items SET
  qty          =  10,
  min_stock    =   8,
  product_units =  500   -- 10 × 50
WHERE id = 'INV-T1-003'; -- Resistance Bands  (R-03, CLT-102)

UPDATE public.inventory_items SET
  qty          =  16,
  min_stock    =  12,
  product_units =  384   -- 16 × 24
WHERE id = 'INV-T1-004'; -- Organic Coffee Beans  (R-03, CLT-103)

UPDATE public.inventory_items SET
  qty          =  30,
  min_stock    =  20,
  product_units =  360   -- 30 × 12
WHERE id = 'INV-T1-005'; -- Storage Bins  (R-04, CLT-104)

UPDATE public.inventory_items SET
  qty          =  20,
  min_stock    =  25,   -- intentional LOW STOCK alert
  product_units =  160   -- 20 × 8
WHERE id = 'INV-T1-006'; -- Kitchen Organizer  (R-04, CLT-104)

UPDATE public.inventory_items SET
  qty          =  10,
  min_stock    =   8,
  product_units =  240   -- 10 × 24
WHERE id = 'INV-T1-007'; -- Bamboo Shelf Dividers  (R-04, CLT-104)

UPDATE public.inventory_items SET
  qty          =  20,
  min_stock    =  12,
  product_units =   40   -- 20 × 2
WHERE id = 'INV-T1-008'; -- Espresso Machine quarantined  (R-04, CLT-103)

UPDATE public.inventory_items SET
  qty          =  85,
  min_stock    =  30,
  product_units = 2040   -- 85 × 24
WHERE id = 'INV-T1-009'; -- Wireless Earbuds (pick)  (FP-01, CLT-101)

UPDATE public.inventory_items SET
  qty          =  40,
  min_stock    =  25,
  product_units =  480   -- 40 × 12
WHERE id = 'INV-T1-010'; -- Smart Watch (pick)  (FP-02, CLT-101)

UPDATE public.inventory_items SET
  qty          =  30,
  min_stock    =  20,
  product_units =  720   -- 30 × 24
WHERE id = 'INV-T1-011'; -- Coffee Beans (pick)  (FP-02, CLT-103)

UPDATE public.inventory_items SET
  qty          =  78,
  min_stock    =  50,
  product_units = 1872   -- 78 × 24
WHERE id = 'INV-T1-012'; -- Coffee Beans (overflow)  (OV-01, CLT-103)

UPDATE public.inventory_items SET
  qty          =  18,
  min_stock    =   0,
  product_units =  432   -- 18 × 24
WHERE id = 'INV-T1-013'; -- Wireless Earbuds (return)  (RT-01)

-- Verify (uncomment to check):
-- SELECT SUM(qty) FROM public.inventory_items WHERE tenant_id = 'tenant-1';
-- -- expected: 566
-- SELECT SUM(used_capacity), SUM(total_capacity) FROM public.warehouse_zones WHERE tenant_id = 'tenant-1';
-- -- expected: 566, 680
