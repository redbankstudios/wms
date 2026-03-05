-- ── Delivery Zones for tenant-1 ───────────────────────────────────────────────
-- Warehouse: LOC-001  San Jose Main Warehouse  ~37.3382, -121.8863
insert into public.delivery_zones
  (id, tenant_id, location_id, name, center_lat, center_lng, radius_km, color, description)
values
  ('DZ-001', 'tenant-1', 'LOC-001', 'Downtown SJ',  37.3382, -121.8863,  8, '#ef4444', 'Downtown San Jose core area'),
  ('DZ-002', 'tenant-1', 'LOC-001', 'South Bay',    37.2871, -121.9500, 15, '#3b82f6', 'Campbell, Milpitas, Santa Clara'),
  ('DZ-003', 'tenant-1', 'LOC-001', 'Peninsula',    37.4022, -122.0957, 20, '#8b5cf6', 'Palo Alto, Mountain View, Sunnyvale, Cupertino'),
  ('DZ-004', 'tenant-1', 'LOC-001', 'East Bay',     37.4323, -121.8996, 18, '#10b981', 'Milpitas, Fremont, Newark')
on conflict (id) do nothing;

-- ── Drivers for tenant-1 ──────────────────────────────────────────────────────
-- IDs match the driverId strings used on existing routes/messages (DRV-01..05).
insert into public.drivers
  (id, tenant_id, name, email, phone, vehicle_id, zone_id, max_stops, status)
values
  ('DRV-01', 'tenant-1', 'John Doe',       'john.doe@techcorp.com',     '(408) 555-0101', 'VEH-101', 'DZ-002', 15, 'active'),
  ('DRV-02', 'tenant-1', 'Alice Smith',    'alice.smith@techcorp.com',  '(408) 555-0102', 'VEH-103', 'DZ-003', 12, 'active'),
  ('DRV-03', 'tenant-1', 'Bob Johnson',    'bob.johnson@techcorp.com',  '(408) 555-0103', 'VEH-105', 'DZ-004', 18, 'active'),
  ('DRV-04', 'tenant-1', 'Sarah Williams', 'sarah.w@techcorp.com',      '(408) 555-0104', 'VEH-102', 'DZ-001', 14, 'active'),
  ('DRV-05', 'tenant-1', 'Mike Davis',     'mike.davis@techcorp.com',   '(408) 555-0105', null,      'DZ-002', 15, 'active')
on conflict (id) do nothing;

-- ── Vehicle capacity backfill ─────────────────────────────────────────────────
update public.vehicles set max_weight_kg = 1000, max_packages = 150 where id = 'VEH-101';
update public.vehicles set max_weight_kg = 3500, max_packages = 400 where id = 'VEH-102';
update public.vehicles set max_weight_kg = 1000, max_packages = 150 where id = 'VEH-103';
update public.vehicles set max_weight_kg = 1500, max_packages = 200 where id = 'VEH-105';

-- ── Route stop weight backfill ────────────────────────────────────────────────
update public.route_stops set weight_kg = 15 where id = 'STP-01';
update public.route_stops set weight_kg = 5  where id = 'STP-02';
update public.route_stops set weight_kg = 25 where id = 'STP-03';
update public.route_stops set weight_kg = 10 where id = 'STP-04';
update public.route_stops set weight_kg = 20 where id = 'STP-05';
update public.route_stops set weight_kg = 15 where id = 'STP-06';
update public.route_stops set weight_kg = 5  where id = 'STP-07';
update public.route_stops set weight_kg = 30 where id = 'STP-08';
update public.route_stops set weight_kg = 10 where id = 'STP-09';
update public.route_stops set weight_kg = 40 where id = 'STP-10';
update public.route_stops set weight_kg = 25 where id = 'STP-11';
update public.route_stops set weight_kg = 15 where id = 'STP-12';

-- ── New packed orders ready for dispatch ─────────────────────────────────────
-- Delivery coords seeded so no geocoding API call is needed for the demo.
insert into public.orders
  (id, tenant_id, status, customer, destination, items, delivery_lat, delivery_lng)
values
  ('ORD-D001', 'tenant-1', 'packed', 'Apple Inc.',         '1 Apple Park Way, Cupertino, CA 95014',        3,  37.3346, -122.0090),
  ('ORD-D002', 'tenant-1', 'packed', 'Intel Santa Clara',  '2200 Mission College Blvd, Santa Clara, CA',   8,  37.3862, -121.9754),
  ('ORD-D003', 'tenant-1', 'packed', 'VMware Palo Alto',   '3900 Fabian Way, Palo Alto, CA 94303',         2,  37.4022, -122.0957),
  ('ORD-D004', 'tenant-1', 'packed', 'Campbell Goods Co.', '480 E Hamilton Ave, Campbell, CA 95008',       12, 37.2871, -121.9500),
  ('ORD-D005', 'tenant-1', 'packed', 'Google Mountain View','1600 Amphitheatre Pkwy, Mountain View, CA',   5,  37.3861, -122.0839)
on conflict (id) do nothing;
