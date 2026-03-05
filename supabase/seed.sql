TRUNCATE TABLE
  public.driver_messages,
  public.inbound_box_items,
  public.inbound_boxes,
  public.inbound_pallets,
  public.inbound_shipments,
  public.events,
  public.payments,
  public.shipments,
  public.products,
  public.clients,
  public.locations,
  public.putaway_suggestions,
  public.tenant_storage_summaries,
  public.storage_locations,
  public.racks,
  public.warehouse_zones,
  public.users,
  public.notifications,
  public.invoices,
  public.vehicles,
  public.return_lines,
  public.returns,
  public.route_exceptions,
  public.route_stops,
  public.routes,
  public.order_lines,
  public.orders,
  public.tasks,
  public.inventory_items,
  public.tenants
CASCADE;

-- Tenants
insert into public.tenants
(id, name, contact, email, phone, status, storage_used, storage_capacity, storage_label, plan, address, joined, billing_cycle, payment_method)
values
('tenant-1', 'TechCorp Electronics', 'Sarah Jenkins', 'sarah@techcorp.com', '555-0123', 'active', 1250, 2000, '1,250 / 2,000', 'Enterprise', '123 Tech Blvd, San Jose, CA 95110', 'Jan 15, 2022', 'Monthly (1st)', 'Visa •••• 4242'),
('tenant-2', 'BeanRoasters Coffee', 'Mike Torres', 'mike@beanroasters.com', '555-0124', 'active', 450, 500, '450 / 500', 'Pro', '456 Roaster Way, Seattle, WA 98101', 'Mar 22, 2022', 'Monthly (15th)', 'Mastercard •••• 8899'),
('tenant-3', 'FitLife Athletics', 'Jessica Wong', 'jwong@fitlife.com', '555-0125', 'onboarding', 0, 1000, '0 / 1,000', 'Pro', '789 Fitness Dr, Austin, TX 78701', 'Oct 01, 2023', 'Monthly (1st)', 'Pending'),
('tenant-4', 'HomeGoods Plus', 'David Chen', 'dchen@homegoods.com', '555-0126', 'inactive', 0, 0, '0 / 0', 'Basic', '321 Home Ln, Chicago, IL 60601', 'Jun 10, 2021', 'Manual', 'Wire Transfer');

-- Orders
insert into public.orders
(id, tenant_id, order_number, status, customer, destination, created_at, items)
values
('ORD-5001', 'tenant-1', 'ORD-5001', 'shipped',   'TechCorp',     'San Francisco, CA', 'Oct 24, 2023', 45),
('ORD-5002', 'tenant-2', 'ORD-5002', 'packed',    'BeanRoasters', 'Seattle, WA',       'Oct 24, 2023', 12),
('ORD-5003', 'tenant-3', 'ORD-5003', 'picking',   'FitLife',      'Austin, TX',        'Oct 24, 2023', 3),
('ORD-5004', 'tenant-1', 'ORD-5004', 'packed',    'TechCorp',     'Austin, TX',        'Oct 23, 2023', 5),
('ORD-5005', 'tenant-2', 'ORD-5005', 'allocated', 'BeanRoasters', 'Portland, OR',      'Oct 23, 2023', 8),
('ORD-5006', 'tenant-3', 'ORD-5006', 'pending',   'FitLife',      'Dallas, TX',        'Oct 23, 2023', 1),
('ORD-5007', 'tenant-2', 'ORD-5007', 'delivered', 'BeanRoasters', 'Vancouver, BC',     'Oct 23, 2023', 24),
('ORD-5008', 'tenant-1', 'ORD-5008', 'picking',   'TechCorp',     'New York, NY',      'Oct 23, 2023', 120);

-- Order lines
insert into public.order_lines
(id, order_id, sku, name, quantity, location, status)
values
('LN-ORD-5003-1', 'ORD-5003', 'SKU-3001', 'Yoga Mat (Blue)',        2, null, 'allocated'),
('LN-ORD-5003-2', 'ORD-5003', 'SKU-3044', 'Resistance Bands Set',   1, null, 'pending');

-- Tasks
insert into public.tasks
(id, tenant_id, type, status, assignee, location, items, priority)
values
('TSK-1042', 'tenant-1', 'Pick',     'pending',     'Unassigned', 'Zone A • Aisle 04',     3,  'high'),
('TSK-1043', 'tenant-1', 'Putaway',  'in_progress', 'Mike D.',    'Rec Dock • Door 2',     12, 'normal'),
('TSK-1044', 'tenant-1', 'Pick',     'pending',     'Sarah J.',   'Zone B • Aisle 01',     1,  'normal'),
('TSK-1045', 'tenant-1', 'Pack',     'completed',   'Tom W.',     'Pack Station 3',        5,  'normal'),
('TSK-1046', 'tenant-1', 'Receive',  'in_progress', 'Alex R.',    'Rec Dock • Door 1',     24, 'urgent'),
('TSK-1047', 'tenant-1', 'Return',   'pending',     'Unassigned', 'Return Station 1',      2,  'normal');

-- Inventory
insert into public.inventory_items
(id, tenant_id, sku, name, location, status, qty, min_stock, client)
values
('INV-001', 'tenant-1', 'SKU-1001', 'Wireless Earbuds',    'A-01-01', 'available',   450, 500, 'TechCorp'),
('INV-002', 'tenant-1', 'SKU-1002', 'Smart Watch',         'A-01-02', 'reserved',    120, 100, 'TechCorp'),
('INV-003', 'tenant-2', 'SKU-2001', 'Organic Coffee Beans','B-02-01', 'available',   850, 500, 'BeanRoasters'),
('INV-004', 'tenant-2', 'SKU-2002', 'Espresso Machine',    'B-02-02', 'quarantined',  15,  20, 'BeanRoasters'),
('INV-005', 'tenant-3', 'SKU-3001', 'Yoga Mat',            'C-01-01', 'available',   320, 150, 'FitLife');

-- Routes
insert into public.routes
(id, tenant_id, driver_id, driver_name, vehicle_id, status, shift, progress)
values
('RT-842', 'tenant-1', 'DRV-01', 'John Doe',       'VEH-101',    'on_route',  '08:00 AM - 04:00 PM', '8/15'),
('RT-843', 'tenant-1', 'DRV-02', 'Alice Smith',     'VEH-103',    'on_route',  '09:00 AM - 05:00 PM', '2/12'),
('RT-840', 'tenant-1', 'DRV-03', 'Bob Johnson',     'VEH-105',    'break',     '07:00 AM - 03:00 PM', '10/18'),
('RT-839', 'tenant-1', 'DRV-04', 'Sarah Williams',  'VEH-102',    'completed', '06:00 AM - 02:00 PM', '14/14'),
('RT-844', 'tenant-1', 'DRV-05', 'Mike Davis',      'Unassigned', 'available', '10:00 AM - 06:00 PM', '0/0');

-- Route stops (all routes with coordinates)
insert into public.route_stops
(id, route_id, customer, address, time, status, packages, notes, lat, lng)
values
-- RT-842 (John Doe)
('STP-01', 'RT-842', 'TechCorp HQ',       '123 Innovation Dr, Suite 400',     '09:00 AM - 11:00 AM', 'completed', 3, null,                                    37.3835, -121.9718),
('STP-02', 'RT-842', 'Sarah Jenkins',     '456 Elm St, Apt 2B',               '11:30 AM - 01:00 PM', 'next',      1, 'Leave at front desk if not home.',     37.3284, -121.8869),
('STP-03', 'RT-842', 'BeanRoasters Cafe', '789 Coffee Ln',                    '01:30 PM - 03:00 PM', 'pending',   5, null,                                    37.3688, -121.9886),
-- RT-843 (Alice Smith)
('STP-04', 'RT-843', 'Westfield Tech',    '2200 Mission College Blvd',        '09:30 AM - 10:30 AM', 'completed', 2, null,                                    37.3862, -121.9754),
('STP-05', 'RT-843', 'Oak Coffee Co',     '1320 S Sunnyvale Ave',             '10:45 AM - 11:45 AM', 'next',      4, null,                                    37.3579, -122.0087),
('STP-06', 'RT-843', 'Peak Analytics',    '400 Castro St, Mountain View',     '12:00 PM - 01:00 PM', 'pending',   3, null,                                    37.3861, -122.0839),
('STP-07', 'RT-843', 'Harbor Fitness',    '3900 Fabian Way, Palo Alto',       '01:30 PM - 02:30 PM', 'pending',   1, null,                                    37.4022, -122.0957),
-- RT-840 (Bob Johnson)
('STP-08', 'RT-840', 'Campbell Goods',    '480 E Hamilton Ave, Campbell',     '07:30 AM - 08:30 AM', 'completed', 6, null,                                    37.2871, -121.9500),
('STP-09', 'RT-840', 'Westside Market',   '5150 Stevens Creek Blvd',         '08:45 AM - 09:45 AM', 'completed', 2, null,                                    37.3230, -121.9610),
('STP-10', 'RT-840', 'FitLife North SJ',  '1600 Technology Dr, Milpitas',    '10:30 AM - 11:30 AM', 'next',      8, null,                                    37.4323, -121.8996),
-- RT-839 (Sarah Williams — all completed)
('STP-11', 'RT-839', 'Cupertino Depot',   '20400 Stevens Creek Blvd',        '06:30 AM - 08:00 AM', 'completed', 5, null,                                    37.3230, -122.0322),
('STP-12', 'RT-839', 'Los Gatos Roasters','15 N Santa Cruz Ave',             '08:30 AM - 10:00 AM', 'completed', 3, null,                                    37.2358, -121.9624);

-- Route exceptions
insert into public.route_exceptions
(id, route_id, driver, stop_id, customer, issue, time, status)
values
('EXC-001', 'RT-842', 'John Doe',    'STP-08', 'TechCorp',    'Customer Not Home',     '10:45 AM', 'unresolved'),
('EXC-002', 'RT-843', 'Alice Smith', 'STP-03', 'BeanRoasters','Wrong Address',          '11:15 AM', 'unresolved'),
('EXC-003', 'RT-840', 'Bob Johnson', 'STP-05', 'FitLife',     'Traffic Delay (+45m)',   '09:30 AM', 'resolved');

-- Returns
insert into public.returns
(id, tenant_id, order_id, client, date, items, reason, status, disposition)
values
('RET-9001', 'tenant-1', 'ORD-5001', 'TechCorp',    'Oct 25, 2023', 1, 'Defective',            'pending',    '-'),
('RET-9002', 'tenant-1', 'ORD-4920', 'FitLife',     'Oct 24, 2023', 2, 'Wrong Size',           'inspecting', '-'),
('RET-9003', 'tenant-1', 'ORD-4855', 'BeanRoasters','Oct 22, 2023', 1, 'Damaged in Transit',   'completed',  'Scrap'),
('RET-9004', 'tenant-1', 'ORD-4810', 'TechCorp',    'Oct 21, 2023', 3, 'Customer Cancellation','completed',  'Restock');

-- Return lines
insert into public.return_lines
(id, return_id, sku, name, qty, condition)
values
('RL-9001-1', 'RET-9001', 'SKU-1001', 'Wireless Earbuds', 1, 'Unknown'),
('RL-9002-1', 'RET-9002', 'SKU-3044', 'Yoga Mat (Blue)',   2, 'Opened');

-- Vehicles
insert into public.vehicles
(id, tenant_id, type, plate, status, driver, location, last_service, next_service)
values
('VEH-101', 'tenant-1', 'Cargo Van',       'CA-88921', 'good',         'John Doe',       'On Route (Downtown)',    'Aug 15, 2023', 'Feb 15, 2024'),
('VEH-102', 'tenant-1', 'Box Truck (16'')', 'CA-99210', 'needs_service','Sarah Williams', 'Warehouse Yard',         'May 10, 2023', 'Nov 10, 2023'),
('VEH-103', 'tenant-1', 'Cargo Van',       'CA-88922', 'good',         'Alice Smith',    'On Route (Northside)',   'Sep 01, 2023', 'Mar 01, 2024'),
('VEH-104', 'tenant-1', 'Cargo Van',       'CA-88923', 'good',         'Unassigned',     'Warehouse Yard',         'Sep 15, 2023', 'Mar 15, 2024'),
('VEH-105', 'tenant-1', 'Box Truck (24'')', 'CA-77123', 'in_repair',   'Unassigned',     'Joe''s Auto Shop',       'Oct 20, 2023', 'TBD'),
('VEH-106', 'tenant-1', 'Box Truck (16'')', 'CA-99211', 'good',         'Unassigned',     'Warehouse Yard',         'Oct 01, 2023', 'Apr 01, 2024');

-- Invoices
insert into public.invoices
(id, tenant_id, date, amount, status, period)
values
('INV-2023-10', 'tenant-1', 'Oct 01, 2023', '$12,450.00', 'paid', 'Sep 2023'),
('INV-2023-09', 'tenant-1', 'Sep 01, 2023', '$11,820.50', 'paid', 'Aug 2023'),
('INV-2023-08', 'tenant-1', 'Aug 01, 2023', '$10,950.00', 'paid', 'Jul 2023'),
('INV-2023-11', 'tenant-1', 'Nov 01, 2023', '$13,100.00', 'due',  'Oct 2023');

-- Notifications
insert into public.notifications
(id, tenant_id, type, message, read, created_at)
values
('NOT-001', 'tenant-1', 'alert', 'Low stock alert for SKU-1002', false, '2023-10-25T10:00:00Z'),
('NOT-002', 'tenant-1', 'info',  'Shipment ORD-5001 has been delivered', true, '2023-10-24T15:30:00Z'),
('NOT-003', 'tenant-2', 'alert', 'BeanRoasters storage at 90% capacity', false, '2023-10-24T09:00:00Z');

-- Users
insert into public.users
(id, tenant_id, name, email, role, active)
values
('USR-001', 'tenant-1', 'Alice Admin',   'alice@techcorp.com', 'business_owner',    true),
('USR-002', 'tenant-1', 'Bob Manager',   'bob@techcorp.com',   'warehouse_manager', true),
('USR-003', 'tenant-1', 'Tom Worker',    'tom@techcorp.com',   'warehouse_employee',true),
('USR-004', 'tenant-2', 'Mike Torres',   'mike@beanroasters.com','business_owner',  true),
('USR-005', 'tenant-3', 'Jessica Wong',  'jwong@fitlife.com',  'business_owner',    true);

-- Warehouse zones
insert into public.warehouse_zones
(id, tenant_id, warehouse_id, name, type, color, total_capacity, used_capacity)
values
('Z-01', 'tenant-1', 'WH-01', 'Reserve Storage', 'reserve',      'blue',    1200, 950),
('Z-02', 'tenant-1', 'WH-01', 'Forward Pick',     'forward_pick', 'emerald',  400, 320),
('Z-03', 'tenant-1', 'WH-01', 'Overflow',          'overflow',     'amber',    300, 280),
('Z-04', 'tenant-1', 'WH-01', 'Returns',           'returns',      'red',      100,  85),
('Z-05', 'tenant-1', 'WH-01', 'Staging',           'staging',      'slate',    200,  50);

-- Racks
insert into public.racks
(id, tenant_id, warehouse_id, zone_id, code, side, level_count, bay_count, total_capacity, used_capacity, preferred_client_id)
values
('R-01', 'tenant-1', 'WH-01', 'Z-01', 'R-01',  'A', 5, 10, 100,  95, 'C-101'),
('R-02', 'tenant-1', 'WH-01', 'Z-01', 'R-02',  'B', 5, 10, 100, 100, 'C-101'),
('R-03', 'tenant-1', 'WH-01', 'Z-01', 'R-03',  'A', 5, 10, 100,  40, 'C-102'),
('R-04', 'tenant-1', 'WH-01', 'Z-01', 'R-04',  'B', 5, 10, 100,  80, null),
('R-05', 'tenant-1', 'WH-01', 'Z-02', 'FP-01', 'A', 3, 15,  90,  85, null),
('R-06', 'tenant-1', 'WH-01', 'Z-02', 'FP-02', 'B', 3, 15,  90,  70, null),
('R-07', 'tenant-1', 'WH-01', 'Z-03', 'OV-01', 'A', 4, 10,  80,  78, null),
('R-08', 'tenant-1', 'WH-01', 'Z-04', 'RT-01', 'A', 2,  5,  20,  18, null);

-- Storage locations
insert into public.storage_locations
(id, tenant_id, warehouse_id, zone_id, rack_id, code, level, bay, type, max_pallets, current_pallets, utilization_percent, assigned_client_id)
values
('L-001', 'tenant-1', 'WH-01', 'Z-01', 'R-01', 'R-01-A-1-1', 1, 1, 'pallet', 2, 2, 100, 'C-101'),
('L-002', 'tenant-1', 'WH-01', 'Z-01', 'R-01', 'R-01-A-1-2', 1, 2, 'pallet', 2, 2, 100, 'C-101'),
('L-003', 'tenant-1', 'WH-01', 'Z-01', 'R-01', 'R-01-A-1-3', 1, 3, 'pallet', 2, 1,  50, 'C-101'),
('L-004', 'tenant-1', 'WH-01', 'Z-01', 'R-01', 'R-01-A-2-1', 2, 1, 'pallet', 2, 2, 100, 'C-101'),
('L-005', 'tenant-1', 'WH-01', 'Z-01', 'R-01', 'R-01-A-2-2', 2, 2, 'pallet', 2, 0,   0, null),
('L-006', 'tenant-1', 'WH-01', 'Z-01', 'R-03', 'R-03-A-1-1', 1, 1, 'pallet', 2, 2, 100, 'C-102'),
('L-007', 'tenant-1', 'WH-01', 'Z-01', 'R-03', 'R-03-A-1-2', 1, 2, 'pallet', 2, 1,  50, 'C-103'),
('L-008', 'tenant-1', 'WH-01', 'Z-01', 'R-03', 'R-03-A-1-3', 1, 3, 'pallet', 2, 0,   0, null),
('L-009', 'tenant-1', 'WH-01', 'Z-03', 'R-07', 'OV-01-A-1-1',1, 1, 'pallet', 2, 2, 100, 'C-103');

-- Tenant storage summaries
insert into public.tenant_storage_summaries
(client_id, client_name, pallets_stored, zones_used, racks_used, fragmentation_score, preferred_zone, utilization_percent)
values
('C-101', 'TechCorp',    450, 2,  5, 'low',    'Reserve Storage', 92),
('C-102', 'FitLife',     120, 1,  2, 'low',    'Reserve Storage', 85),
('C-103', 'BeanRoasters',340, 4, 12, 'high',   'Reserve Storage', 60),
('C-104', 'HomeGoods',   210, 2,  4, 'medium', 'Forward Pick',    78);

-- Putaway suggestions
insert into public.putaway_suggestions
(id, type, message, priority, action_label)
values
('S-01', 'consolidation', 'BeanRoasters is split across 12 racks; consolidate into Zone A (Reserve).', 'high',   'View Consolidation Plan'),
('S-02', 'overflow',      'Reserve Rack R-02 is at 100% capacity; redirect new TechCorp pallets to Overflow Zone.', 'medium', 'Update Rules'),
('S-03', 'replenishment', 'Forward Pick Zone is low on capacity for fast movers (TechCorp).', 'high',   'Create Replenishment Task'),
('S-04', 'grouping',      'Returns zone occupancy is rising (85%); clear RTV pallets.', 'medium', 'Process Returns'),
('S-05', 'grouping',      'Preferred tenant grouping available in Rack R-03 for FitLife.', 'low',    'Assign Rack');

-- Locations (physical warehouses)
insert into public.locations
(id, tenant_id, name, address, type)
values
('LOC-001', 'tenant-1', 'San Jose Main Warehouse',   '123 Tech Blvd, San Jose, CA 95110',   'warehouse'),
('LOC-002', 'tenant-1', 'Oakland Distribution Center','456 Port Ave, Oakland, CA 94601',      'distribution'),
('LOC-003', 'tenant-2', 'Seattle Roasters Warehouse', '456 Roaster Way, Seattle, WA 98101',   'warehouse'),
('LOC-004', 'tenant-3', 'Austin FitLife Hub',         '789 Fitness Dr, Austin, TX 78701',     'warehouse');

-- Clients (B2B clients per tenant)
insert into public.clients
(id, tenant_id, name, contact_name, contact_email, contact_phone, billing_plan, status)
values
('CLT-101', 'tenant-1', 'TechCorp Electronics', 'Sarah Jenkins', 'sarah@techcorp.com',    '555-0123', 'Enterprise', 'active'),
('CLT-102', 'tenant-1', 'FitLife Athletics',     'Jessica Wong',  'jwong@fitlife.com',     '555-0125', 'Pro',        'active'),
('CLT-103', 'tenant-1', 'BeanRoasters Coffee',   'Mike Torres',   'mike@beanroasters.com', '555-0124', 'Pro',        'active'),
('CLT-104', 'tenant-1', 'HomeGoods Plus',         'David Chen',    'dchen@homegoods.com',   '555-0126', 'Basic',      'inactive'),
('CLT-201', 'tenant-2', 'Pacific Roasters',       'Anna Lee',      'anna@pacificroasters.com','555-0200','Pro',       'active'),
('CLT-301', 'tenant-3', 'West Coast Gyms',        'Ryan Park',     'ryan@wcgyms.com',       '555-0300', 'Basic',      'active');

-- Products (product catalog tied to clients)
insert into public.products
(id, tenant_id, client_id, sku, name, barcode, weight, dimensions, unit_cost, status)
values
('PRD-001', 'tenant-1', 'CLT-101', 'SKU-1001', 'Wireless Earbuds',     '8901234567890', '0.2 kg', '10x8x4 cm',  '$45.00',  'active'),
('PRD-002', 'tenant-1', 'CLT-101', 'SKU-1002', 'Smart Watch',           '8901234567891', '0.5 kg', '20x15x5 cm', '$199.00', 'active'),
('PRD-003', 'tenant-1', 'CLT-101', 'SKU-1003', 'Bluetooth Speaker',     '8901234567892', '1.2 kg', '25x15x12 cm','$89.00',  'active'),
('PRD-004', 'tenant-1', 'CLT-103', 'SKU-2001', 'Organic Coffee Beans',  '8902345678901', '1.0 kg', '30x20x10 cm','$18.00',  'active'),
('PRD-005', 'tenant-1', 'CLT-103', 'SKU-2002', 'Espresso Machine',      '8902345678902', '5.5 kg', '40x30x35 cm','$320.00', 'active'),
('PRD-006', 'tenant-1', 'CLT-102', 'SKU-3001', 'Yoga Mat (Blue)',       '8903456789001', '1.5 kg', '180x60x0.5 cm','$35.00','active'),
('PRD-007', 'tenant-1', 'CLT-102', 'SKU-3044', 'Resistance Bands Set',  '8903456789044', '0.4 kg', '25x15x5 cm', '$22.00',  'active'),
('PRD-008', 'tenant-2', 'CLT-201', 'SKU-P001', 'Single Origin Ethiopia', '8904567890001', '0.5 kg', '20x15x8 cm', '$24.00',  'active'),
('PRD-009', 'tenant-3', 'CLT-301', 'SKU-G001', 'Pull-Up Bar',            '8905678900001', '2.0 kg', '100x10x10 cm','$55.00', 'active');

-- Shipments (linked to existing orders)
insert into public.shipments
(id, tenant_id, order_id, tracking_number, carrier, status, weight, dimensions, created_at)
values
('SHP-001', 'tenant-1', 'ORD-5001', 'TRK-1Z9874650310225504', 'UPS',   'delivered', '12.5 kg', '60x40x30 cm', '2023-10-24T10:00:00Z'),
('SHP-002', 'tenant-2', 'ORD-5002', 'TRK-9400111899223487505', 'USPS',  'in_transit','3.2 kg',  '30x20x15 cm', '2023-10-24T11:30:00Z'),
('SHP-003', 'tenant-1', 'ORD-5004', 'TRK-7740190200551539',    'FedEx', 'packed',    '2.1 kg',  '25x20x15 cm', '2023-10-23T14:00:00Z'),
('SHP-004', 'tenant-2', 'ORD-5007', 'TRK-9400111899224981756', 'USPS',  'delivered', '8.0 kg',  '50x40x25 cm', '2023-10-23T09:00:00Z');

-- Payments (detailed billing records per client)
insert into public.payments
(id, tenant_id, client_id, amount, status, billing_period, plan, metadata, created_at)
values
('PAY-001', 'tenant-1', 'CLT-101', '$8,200.00', 'paid',    'Sep 2023', 'Enterprise', '{"storage_fee":"$3200","pick_pack_fee":"$4100","route_fee":"$900"}',  '2023-10-01T00:00:00Z'),
('PAY-002', 'tenant-1', 'CLT-103', '$2,450.00', 'paid',    'Sep 2023', 'Pro',        '{"storage_fee":"$1200","pick_pack_fee":"$950","route_fee":"$300"}',   '2023-10-01T00:00:00Z'),
('PAY-003', 'tenant-1', 'CLT-102', '$1,800.00', 'paid',    'Sep 2023', 'Pro',        '{"storage_fee":"$800","pick_pack_fee":"$750","route_fee":"$250"}',    '2023-10-01T00:00:00Z'),
('PAY-004', 'tenant-1', 'CLT-101', '$9,100.00', 'due',     'Oct 2023', 'Enterprise', '{"storage_fee":"$3500","pick_pack_fee":"$4600","route_fee":"$1000"}', '2023-11-01T00:00:00Z'),
('PAY-005', 'tenant-1', 'CLT-103', '$2,750.00', 'due',     'Oct 2023', 'Pro',        '{"storage_fee":"$1300","pick_pack_fee":"$1100","route_fee":"$350"}',  '2023-11-01T00:00:00Z'),
('PAY-006', 'tenant-2', 'CLT-201', '$1,200.00', 'paid',    'Sep 2023', 'Pro',        '{"storage_fee":"$600","pick_pack_fee":"$450","route_fee":"$150"}',    '2023-10-01T00:00:00Z');

-- Events (audit log / webhook events)
insert into public.events
(id, tenant_id, source, event_type, payload, received_at)
values
('EVT-001', 'tenant-1', 'shopify',  'orders/create',    '{"order_id":"ORD-5008","customer":"TechCorp","items":120}',           '2023-10-23T08:00:00Z'),
('EVT-002', 'tenant-1', 'internal', 'order.allocated',  '{"order_id":"ORD-5004","allocated_by":"USR-001"}',                   '2023-10-23T09:15:00Z'),
('EVT-003', 'tenant-1', 'internal', 'task.completed',   '{"task_id":"TSK-1045","completed_by":"USR-003","duration_min":22}',   '2023-10-24T11:00:00Z'),
('EVT-004', 'tenant-1', 'internal', 'shipment.created', '{"shipment_id":"SHP-001","order_id":"ORD-5001","carrier":"UPS"}',     '2023-10-24T10:00:00Z'),
('EVT-005', 'tenant-1', 'shopify',  'orders/fulfilled', '{"order_id":"ORD-5001","tracking":"TRK-1Z9874650310225504"}',         '2023-10-24T16:00:00Z'),
('EVT-006', 'tenant-1', 'internal', 'return.initiated', '{"return_id":"RET-9001","order_id":"ORD-5001","reason":"Defective"}', '2023-10-25T10:05:00Z'),
('EVT-007', 'tenant-2', 'shopify',  'orders/create',    '{"order_id":"ORD-5002","customer":"BeanRoasters","items":12}',        '2023-10-24T08:30:00Z'),
('EVT-008', 'tenant-1', 'internal', 'inventory.low_stock','{"sku":"SKU-1001","qty":450,"min_stock":500,"client":"TechCorp"}',  '2023-10-25T10:00:00Z');

-- Inbound shipments
insert into public.inbound_shipments
(id, tenant_id, client_id, reference_number, carrier, status, arrival_date, arrival_window_start, arrival_window_end, dock_door, notes, total_pallets, created_at)
values
('INB-001', 'tenant-1', 'CLT-101', 'REF-TC-20231026', 'UPS Freight',  'scheduled', 'Oct 26, 2023', '09:00 AM', '11:00 AM', '2', 'Fragile electronics — handle with care. Temp sensitive.', 4, '2023-10-24T14:00:00Z'),
('INB-002', 'tenant-1', 'CLT-103', 'REF-BR-20231025', 'FedEx Ground', 'receiving',  'Oct 25, 2023', '07:00 AM', '09:00 AM', '1', 'Perishable goods — priority putaway.', 3, '2023-10-23T10:00:00Z'),
('INB-003', 'tenant-1', 'CLT-102', 'REF-FL-20231024', 'DHL',          'complete',   'Oct 24, 2023', '02:00 PM', '04:00 PM', '3', null, 2, '2023-10-22T09:00:00Z');

-- Inbound pallets
insert into public.inbound_pallets
(id, shipment_id, tenant_id, pallet_number, client_id, length, width, height, weight, assigned_zone_id, assigned_rack_id, assigned_location_code, status)
values
-- INB-001 TechCorp (scheduled)
('PAL-001', 'INB-001', 'tenant-1', 'PLT-001', 'CLT-101', '120 cm', '100 cm', '150 cm', '480 kg', 'Z-01', 'R-01', 'R-01-A-3-1', 'expected'),
('PAL-002', 'INB-001', 'tenant-1', 'PLT-002', 'CLT-101', '120 cm', '100 cm', '140 cm', '420 kg', 'Z-01', 'R-01', 'R-01-A-3-2', 'expected'),
('PAL-003', 'INB-001', 'tenant-1', 'PLT-003', 'CLT-101', '120 cm', '100 cm', '160 cm', '510 kg', 'Z-01', 'R-02', 'R-02-B-1-1', 'expected'),
('PAL-004', 'INB-001', 'tenant-1', 'PLT-004', 'CLT-101', '120 cm', '100 cm', '130 cm', '390 kg', 'Z-01', 'R-02', 'R-02-B-1-2', 'expected'),
-- INB-002 BeanRoasters (receiving)
('PAL-005', 'INB-002', 'tenant-1', 'PLT-001', 'CLT-103', '100 cm', '80 cm',  '120 cm', '320 kg', 'Z-01', 'R-03', 'R-03-A-2-1', 'arrived'),
('PAL-006', 'INB-002', 'tenant-1', 'PLT-002', 'CLT-103', '100 cm', '80 cm',  '120 cm', '310 kg', 'Z-01', 'R-03', 'R-03-A-2-2', 'receiving'),
('PAL-007', 'INB-002', 'tenant-1', 'PLT-003', 'CLT-103', '100 cm', '80 cm',  '110 cm', '280 kg', 'Z-02', 'R-05', 'FP-01-A-1-1', 'putaway'),
-- INB-003 FitLife (complete)
('PAL-008', 'INB-003', 'tenant-1', 'PLT-001', 'CLT-102', '120 cm', '100 cm', '130 cm', '350 kg', 'Z-01', 'R-03', 'R-03-A-3-1', 'putaway'),
('PAL-009', 'INB-003', 'tenant-1', 'PLT-002', 'CLT-102', '120 cm', '100 cm', '125 cm', '330 kg', 'Z-01', 'R-03', 'R-03-A-3-2', 'putaway');

-- Inbound boxes
insert into public.inbound_boxes
(id, pallet_id, box_number, length, width, height, weight)
values
-- PAL-001 boxes
('BOX-001', 'PAL-001', 'BOX-01', '40 cm', '30 cm', '20 cm', '12 kg'),
('BOX-002', 'PAL-001', 'BOX-02', '40 cm', '30 cm', '20 cm', '11 kg'),
('BOX-003', 'PAL-001', 'BOX-03', '35 cm', '25 cm', '15 cm', '8 kg'),
-- PAL-002 boxes
('BOX-004', 'PAL-002', 'BOX-01', '50 cm', '40 cm', '30 cm', '18 kg'),
('BOX-005', 'PAL-002', 'BOX-02', '50 cm', '40 cm', '30 cm', '17 kg'),
-- PAL-005 boxes (BeanRoasters)
('BOX-006', 'PAL-005', 'BOX-01', '30 cm', '20 cm', '20 cm', '10 kg'),
('BOX-007', 'PAL-005', 'BOX-02', '30 cm', '20 cm', '20 cm', '10 kg'),
('BOX-008', 'PAL-005', 'BOX-03', '30 cm', '20 cm', '20 cm', '9 kg'),
-- PAL-008 boxes (FitLife)
('BOX-009', 'PAL-008', 'BOX-01', '100 cm', '60 cm', '5 cm',  '15 kg'),
('BOX-010', 'PAL-008', 'BOX-02', '30 cm',  '20 cm', '10 cm', '4 kg');

-- Inbound box items
insert into public.inbound_box_items
(id, box_id, sku, product_name, quantity, unit_weight, unit_dimensions)
values
-- BOX-001 (TechCorp - Wireless Earbuds)
('BITEM-001', 'BOX-001', 'SKU-1001', 'Wireless Earbuds',  6, '0.2 kg', '10x8x4 cm'),
-- BOX-002 (TechCorp - Wireless Earbuds)
('BITEM-002', 'BOX-002', 'SKU-1001', 'Wireless Earbuds',  6, '0.2 kg', '10x8x4 cm'),
-- BOX-003 (TechCorp - Smart Watch)
('BITEM-003', 'BOX-003', 'SKU-1002', 'Smart Watch',        4, '0.5 kg', '20x15x5 cm'),
-- BOX-004 (TechCorp - Bluetooth Speaker)
('BITEM-004', 'BOX-004', 'SKU-1003', 'Bluetooth Speaker',  3, '1.2 kg', '25x15x12 cm'),
-- BOX-005 (TechCorp - Smart Watch)
('BITEM-005', 'BOX-005', 'SKU-1002', 'Smart Watch',        4, '0.5 kg', '20x15x5 cm'),
-- BOX-006 (BeanRoasters - Coffee Beans)
('BITEM-006', 'BOX-006', 'SKU-2001', 'Organic Coffee Beans', 10, '1.0 kg', '30x20x10 cm'),
-- BOX-007 (BeanRoasters - Coffee Beans)
('BITEM-007', 'BOX-007', 'SKU-2001', 'Organic Coffee Beans', 10, '1.0 kg', '30x20x10 cm'),
-- BOX-008 (BeanRoasters - Espresso Machine)
('BITEM-008', 'BOX-008', 'SKU-2002', 'Espresso Machine',   1, '5.5 kg', '40x30x35 cm'),
-- BOX-009 (FitLife - Yoga Mat)
('BITEM-009', 'BOX-009', 'SKU-3001', 'Yoga Mat (Blue)',     5, '1.5 kg', '180x60x0.5 cm'),
-- BOX-010 (FitLife - Resistance Bands)
('BITEM-010', 'BOX-010', 'SKU-3044', 'Resistance Bands Set', 8, '0.4 kg', '25x15x5 cm');

-- Driver Messages (dispatcher ↔ driver communication)
insert into public.driver_messages
(id, tenant_id, driver_id, driver_name, route_id, parent_id, sender_role, body, status, created_at, read_at)
values
-- John Doe (on_route RT-842) — replied thread
('MSG-001', 'tenant-1', 'DRV-01', 'John Doe',      'RT-842', null,    'driver',     'Customer at STP-02 is not answering the door. Should I leave the package or wait?',                                     'replied',    '2026-03-04T09:15:00Z', '2026-03-04T09:17:00Z'),
('MSG-002', 'tenant-1', 'DRV-01', 'John Doe',      'RT-842', 'MSG-001', 'dispatcher', 'Leave it at the front door and take a photo as proof of delivery. Note it in the app.',                               'replied',    '2026-03-04T09:18:00Z', null),
-- Alice Smith (on_route RT-843) — replied thread
('MSG-003', 'tenant-1', 'DRV-02', 'Alice Smith',   'RT-843', null,    'driver',     'Traffic on I-280 is really bad. My ETA for STP-03 is now 12:30 PM instead of 11:45 AM.',                               'replied',    '2026-03-04T10:05:00Z', '2026-03-04T10:07:00Z'),
('MSG-004', 'tenant-1', 'DRV-02', 'Alice Smith',   'RT-843', 'MSG-003', 'dispatcher', 'Understood. I have updated the customer ETA. Try to make up time on the next stops if possible.',                    'replied',    '2026-03-04T10:08:00Z', null),
-- Bob Johnson (break RT-840) — read but no reply
('MSG-005', 'tenant-1', 'DRV-03', 'Bob Johnson',   'RT-840', null,    'driver',     'Taking my 30-minute break at the Shell station on Market St. Back on route at 11:15 AM.',                              'read',       '2026-03-04T10:42:00Z', '2026-03-04T10:45:00Z'),
-- John Doe — another replied thread
('MSG-006', 'tenant-1', 'DRV-01', 'John Doe',      'RT-842', null,    'driver',     'Vehicle check engine light came on. Should I continue or head back to the depot?',                                     'replied',    '2026-03-04T11:00:00Z', '2026-03-04T11:02:00Z'),
('MSG-007', 'tenant-1', 'DRV-01', 'John Doe',      'RT-842', 'MSG-006', 'dispatcher', 'Finish your current stop then head back to depot. I will reassign your remaining stops to Mike once he is dispatched.', 'replied',    '2026-03-04T11:03:00Z', null),
-- Alice Smith — unanswered
('MSG-008', 'tenant-1', 'DRV-02', 'Alice Smith',   'RT-843', null,    'driver',     'The address for STP-04 does not exist. The building number 1478 is vacant. Need a corrected address.',                  'unanswered', '2026-03-04T11:30:00Z', null),
-- Bob Johnson — unanswered
('MSG-009', 'tenant-1', 'DRV-03', 'Bob Johnson',   'RT-840', null,    'driver',     'Customer at STP-07 says they ordered 2 units but I only have 1 in my manifest. Can you verify?',                       'unanswered', '2026-03-04T11:45:00Z', null),
-- Sarah Williams (completed RT-839) — read
('MSG-010', 'tenant-1', 'DRV-04', 'Sarah Williams','RT-839', null,    'driver',     'All deliveries completed for RT-839. Heading back to depot now. ETA 2:10 PM.',                                          'read',       '2026-03-04T13:55:00Z', '2026-03-04T13:56:00Z'),
-- Sarah Williams — replied thread (post-route issue)
('MSG-011', 'tenant-1', 'DRV-04', 'Sarah Williams','RT-839', null,    'driver',     'Customer at STP-12 called me back — they received the wrong item. Says it is a blue box not the red one they ordered.', 'replied',    '2026-03-04T14:05:00Z', '2026-03-04T14:07:00Z'),
('MSG-012', 'tenant-1', 'DRV-04', 'Sarah Williams','RT-839', 'MSG-011', 'dispatcher', 'Thanks for the heads up. I have logged a return request RET-045. No action needed on your end.',                    'replied',    '2026-03-04T14:09:00Z', null),
-- Alice Smith — unanswered (most recent)
('MSG-013', 'tenant-1', 'DRV-02', 'Alice Smith',   'RT-843', null,    'driver',     'Fuel level is low. Is there a gas station on my approved list near the STP-05 area?',                                   'unanswered', '2026-03-04T12:10:00Z', null),
-- Bob Johnson — replied
('MSG-014', 'tenant-1', 'DRV-03', 'Bob Johnson',   'RT-840', null,    'driver',     'My handheld scanner is not reading barcodes. Had to manually enter the last 3 stops.',                                   'replied',    '2026-03-04T08:30:00Z', '2026-03-04T08:32:00Z'),
('MSG-015', 'tenant-1', 'DRV-03', 'Bob Johnson',   'RT-840', 'MSG-014', 'dispatcher', 'Noted. Swap scanner at the depot on your next pass. Manual entry is fine for now — just double-check the quantities.', 'replied',    '2026-03-04T08:35:00Z', null);
