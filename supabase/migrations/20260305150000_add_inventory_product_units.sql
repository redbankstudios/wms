-- Add product_units column to distinguish individual product units from pallet count.
-- qty = pallets in storage; product_units = individual sellable units across those pallets.

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS product_units INTEGER NOT NULL DEFAULT 0;

-- Seed realistic product unit values for all existing items.
-- Units-per-pallet rationale: small items (earbuds, bands) ~24-50, mid (speakers, mats) ~6-12,
-- heavy (machines, furniture) ~2, consumables (coffee bags) ~24.

UPDATE public.inventory_items SET product_units =
  CASE id
    -- tenant-1 original items
    WHEN 'INV-001'    THEN 10800  -- 450 pallets × 24 units (Wireless Earbuds)
    WHEN 'INV-002'    THEN  1440  -- 120 pallets × 12 units (Smart Watch)
    -- tenant-2 items (BeanRoasters own stock)
    WHEN 'INV-003'    THEN 20400  -- 850 pallets × 24 bags  (Organic Coffee Beans)
    WHEN 'INV-004'    THEN    30  --  15 pallets ×  2 units (Espresso Machine)
    -- tenant-3 items (FitLife own stock)
    WHEN 'INV-005'    THEN  3200  -- 320 pallets × 10 units (Yoga Mat)
    -- tenant-1 enriched items
    WHEN 'INV-T1-001' THEN  1680  -- 280 pallets ×  6 units (Bluetooth Speaker)
    WHEN 'INV-T1-002' THEN  3200  -- 320 pallets × 10 units (Yoga Mat Blue)
    WHEN 'INV-T1-003' THEN  8750  -- 175 pallets × 50 units (Resistance Bands Set)
    WHEN 'INV-T1-004' THEN 20400  -- 850 pallets × 24 bags  (Organic Coffee Beans)
    WHEN 'INV-T1-005' THEN  2880  -- 240 pallets × 12 units (Storage Bins 6-pack)
    WHEN 'INV-T1-006' THEN   704  --  88 pallets ×  8 units (Kitchen Organizer Set)
    WHEN 'INV-T1-007' THEN  3720  -- 155 pallets × 24 units (Bamboo Shelf Dividers)
    WHEN 'INV-T1-008' THEN    30  --  15 pallets ×  2 units (Espresso Machine)
    WHEN 'INV-T1-009' THEN  1200  --  50 pallets × 24 units (Wireless Earbuds Pick)
    WHEN 'INV-T1-010' THEN   264  --  22 pallets × 12 units (Smart Watch Pick)
    WHEN 'INV-T1-011' THEN  2880  -- 120 pallets × 24 bags  (Coffee Beans Pick)
    WHEN 'INV-T1-012' THEN 14400  -- 600 pallets × 24 bags  (Coffee Beans Overflow)
    WHEN 'INV-T1-013' THEN    72  --   3 pallets × 24 units (Earbuds Return)
    ELSE 0
  END;
