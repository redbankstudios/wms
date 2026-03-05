-- Fix rack preferred_client_id to match actual client IDs
update public.racks set preferred_client_id = 'CLT-101' where preferred_client_id = 'C-101';
update public.racks set preferred_client_id = 'CLT-102' where preferred_client_id = 'C-102';

-- Update shipment arrival dates to 2026 demo dates
update public.inbound_shipments set
  arrival_date        = 'Mar 06, 2026',
  arrival_window_start = '09:00 AM',
  arrival_window_end   = '11:00 AM',
  created_at          = '2026-03-02T09:00:00+00:00'
where id = 'INB-001';

update public.inbound_shipments set
  arrival_date        = 'Mar 04, 2026',
  arrival_window_start = '07:00 AM',
  arrival_window_end   = '09:00 AM',
  created_at          = '2026-03-01T08:00:00+00:00'
where id = 'INB-002';

update public.inbound_shipments set
  arrival_date        = 'Feb 28, 2026',
  arrival_window_start = '02:00 PM',
  arrival_window_end   = '04:00 PM',
  created_at          = '2026-02-26T10:00:00+00:00'
where id = 'INB-003';

-- Add INB-004: HomeGoods Plus, arrived yesterday (status = arrived)
insert into public.inbound_shipments
  (id, tenant_id, client_id, reference_number, carrier, status, arrival_date, arrival_window_start, arrival_window_end, dock_door, notes, total_pallets, created_at)
values
  ('INB-004', 'tenant-1', 'CLT-104', 'REF-HG-20260303', 'Old Dominion Freight', 'arrived',
   'Mar 03, 2026', '01:00 PM', '03:00 PM', '4',
   'Handle carefully — fragile home goods.', 2,
   '2026-03-01T09:00:00+00:00')
on conflict (id) do update set
  arrival_date         = excluded.arrival_date,
  arrival_window_start = excluded.arrival_window_start,
  arrival_window_end   = excluded.arrival_window_end,
  status               = excluded.status;

-- Pallets for INB-004
insert into public.inbound_pallets
  (id, shipment_id, tenant_id, pallet_number, client_id, length, width, height, weight, assigned_zone_id, assigned_rack_id, assigned_location_code, status)
values
  ('PAL-010', 'INB-004', 'tenant-1', 'PLT-001', 'CLT-104', '120 cm', '100 cm', '140 cm', '410 kg', 'Z-01', 'R-04', 'R-04-A-2-1', 'arrived'),
  ('PAL-011', 'INB-004', 'tenant-1', 'PLT-002', 'CLT-104', '120 cm', '100 cm', '135 cm', '395 kg', 'Z-01', 'R-04', 'R-04-A-2-2', 'arrived')
on conflict (id) do nothing;

-- Boxes for pallets that currently have none
insert into public.inbound_boxes (id, pallet_id, box_number, length, width, height, weight)
values
  ('BOX-011', 'PAL-003', 'BOX-01', '45 cm', '35 cm', '25 cm', '15 kg'),
  ('BOX-012', 'PAL-003', 'BOX-02', '45 cm', '35 cm', '25 cm', '14 kg'),
  ('BOX-013', 'PAL-004', 'BOX-01', '50 cm', '40 cm', '30 cm', '20 kg'),
  ('BOX-014', 'PAL-006', 'BOX-01', '30 cm', '20 cm', '20 cm', '9 kg'),
  ('BOX-015', 'PAL-006', 'BOX-02', '30 cm', '20 cm', '20 cm', '8 kg'),
  ('BOX-016', 'PAL-007', 'BOX-01', '40 cm', '30 cm', '25 cm', '12 kg'),
  ('BOX-017', 'PAL-009', 'BOX-01', '60 cm', '40 cm', '10 cm', '8 kg'),
  ('BOX-018', 'PAL-010', 'BOX-01', '50 cm', '40 cm', '30 cm', '16 kg'),
  ('BOX-019', 'PAL-010', 'BOX-02', '50 cm', '40 cm', '30 cm', '15 kg'),
  ('BOX-020', 'PAL-011', 'BOX-01', '60 cm', '50 cm', '40 cm', '18 kg')
on conflict (id) do nothing;

-- Box items for the new boxes
insert into public.inbound_box_items (id, box_id, sku, product_name, quantity, unit_weight, unit_dimensions)
values
  ('BITEM-011', 'BOX-011', 'SKU-1004', 'Laptop Stand',              4,  '0.9 kg', '30x25x5 cm'),
  ('BITEM-012', 'BOX-012', 'SKU-1005', 'USB-C Hub',                 8,  '0.15 kg','15x8x2 cm'),
  ('BITEM-013', 'BOX-013', 'SKU-1003', 'Bluetooth Speaker',         2,  '1.2 kg', '25x15x12 cm'),
  ('BITEM-014', 'BOX-014', 'SKU-2001', 'Organic Coffee Beans',      12, '1.0 kg', '30x20x10 cm'),
  ('BITEM-015', 'BOX-015', 'SKU-2003', 'Coffee Grinder',            3,  '2.1 kg', '20x15x25 cm'),
  ('BITEM-016', 'BOX-016', 'SKU-2004', 'Cold Brew Kit',             5,  '0.8 kg', '25x15x10 cm'),
  ('BITEM-017', 'BOX-017', 'SKU-3001', 'Yoga Mat (Blue)',           3,  '1.5 kg', '180x60x0.5 cm'),
  ('BITEM-018', 'BOX-018', 'SKU-4001', 'Picture Frame Set',         4,  '1.2 kg', '40x30x5 cm'),
  ('BITEM-019', 'BOX-019', 'SKU-4002', 'Decorative Throw Pillows',  6,  '0.6 kg', '40x40x15 cm'),
  ('BITEM-020', 'BOX-020', 'SKU-4003', 'Scented Candle Collection', 12, '0.3 kg', '10x10x8 cm')
on conflict (id) do nothing;
