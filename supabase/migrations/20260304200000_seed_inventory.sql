-- Re-seed inventory_items for all demo tenants
-- Location codes match the storage_locations codes in the DB
delete from public.inventory_items where id != 'NONE';

insert into public.inventory_items
  (id, tenant_id, sku, name, location, status, qty, min_stock, client)
values
  -- TechCorp Electronics goods (tenant-1 is the WMS operator)
  ('INV-001', 'tenant-1', 'SKU-1001', 'Wireless Earbuds',       'R-01-A-1-1',   'available',    450, 500, 'TechCorp Electronics'),
  ('INV-002', 'tenant-1', 'SKU-1002', 'Smart Watch',            'R-01-A-1-2',   'reserved',     120, 100, 'TechCorp Electronics'),
  ('INV-003', 'tenant-1', 'SKU-1003', 'Laptop Stand',           'R-01-A-1-3',   'available',     85,  50, 'TechCorp Electronics'),
  -- BeanRoasters Coffee goods (client stored in tenant-1 warehouse)
  ('INV-004', 'tenant-1', 'SKU-2001', 'Organic Coffee Beans',   'R-03-A-1-1',   'available',    850, 500, 'BeanRoasters Coffee'),
  ('INV-005', 'tenant-1', 'SKU-2002', 'Espresso Machine',       'R-03-A-1-2',   'quarantined',   15,  20, 'BeanRoasters Coffee'),
  ('INV-006', 'tenant-1', 'SKU-2003', 'Coffee Grinder',         'OV-01-A-1-1',  'available',    230, 100, 'BeanRoasters Coffee'),
  -- FitLife Athletics goods
  ('INV-007', 'tenant-1', 'SKU-3001', 'Yoga Mat',               'R-01-A-2-1',   'available',    320, 150, 'FitLife Athletics'),
  ('INV-008', 'tenant-1', 'SKU-3002', 'Resistance Bands Set',   'R-01-A-2-2',   'reserved',      45,  30, 'FitLife Athletics'),
  -- HomeGoods Plus goods
  ('INV-009', 'tenant-1', 'SKU-4001', 'Scented Candle Set',     'R-03-A-1-3',   'available',    180, 100, 'HomeGoods Plus'),
  ('INV-010', 'tenant-1', 'SKU-4002', 'Throw Pillow Cover',     'R-01-A-2-2',   'pending_receive', 60, 40, 'HomeGoods Plus');
