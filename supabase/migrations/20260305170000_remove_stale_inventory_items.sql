-- Remove stale inventory rows INV-003..INV-010 (tenant-1).
-- These were inserted by an older seed pass and have incorrect qty values,
-- zero product_units, and location/SKU conflicts with the INV-T1-* items.
-- After deletion the sum(qty) for tenant-1 = 566, matching warehouse_zones.used_capacity.

DELETE FROM public.inventory_items
WHERE id IN ('INV-003','INV-004','INV-005','INV-006','INV-007','INV-008','INV-009','INV-010');
