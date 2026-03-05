-- Backfill lat/lng on the three existing stops and insert the remaining nine
-- so all four routes have map-renderable stops.

-- ── Update existing stops with coordinates ──────────────────────────────────
update public.route_stops set lat = 37.3835, lng = -121.9718 where id = 'STP-01';
update public.route_stops set lat = 37.3284, lng = -121.8869 where id = 'STP-02';
update public.route_stops set lat = 37.3688, lng = -121.9886 where id = 'STP-03';

-- ── Insert remaining stops (RT-843, RT-840, RT-839) ─────────────────────────
insert into public.route_stops
  (id, route_id, customer, address, time, status, packages, notes, lat, lng)
values
  -- RT-843 (Alice Smith)
  ('STP-04', 'RT-843', 'Westfield Tech',    '2200 Mission College Blvd',    '09:30 AM - 10:30 AM', 'completed', 2, null,                                 37.3862, -121.9754),
  ('STP-05', 'RT-843', 'Oak Coffee Co',     '1320 S Sunnyvale Ave',         '10:45 AM - 11:45 AM', 'next',      4, null,                                 37.3579, -122.0087),
  ('STP-06', 'RT-843', 'Peak Analytics',    '400 Castro St, Mountain View', '12:00 PM - 01:00 PM', 'pending',   3, null,                                 37.3861, -122.0839),
  ('STP-07', 'RT-843', 'Harbor Fitness',    '3900 Fabian Way, Palo Alto',   '01:30 PM - 02:30 PM', 'pending',   1, null,                                 37.4022, -122.0957),
  -- RT-840 (Bob Johnson)
  ('STP-08', 'RT-840', 'Campbell Goods',    '480 E Hamilton Ave, Campbell', '07:30 AM - 08:30 AM', 'completed', 6, null,                                 37.2871, -121.9500),
  ('STP-09', 'RT-840', 'Westside Market',   '5150 Stevens Creek Blvd',     '08:45 AM - 09:45 AM', 'completed', 2, null,                                 37.3230, -121.9610),
  ('STP-10', 'RT-840', 'FitLife North SJ',  '1600 Technology Dr, Milpitas','10:30 AM - 11:30 AM', 'next',      8, null,                                 37.4323, -121.8996),
  -- RT-839 (Sarah Williams — all completed)
  ('STP-11', 'RT-839', 'Cupertino Depot',   '20400 Stevens Creek Blvd',    '06:30 AM - 08:00 AM', 'completed', 5, null,                                 37.3230, -122.0322),
  ('STP-12', 'RT-839', 'Los Gatos Roasters','15 N Santa Cruz Ave',         '08:30 AM - 10:00 AM', 'completed', 3, null,                                 37.2358, -121.9624)
on conflict (id) do update
  set lat = excluded.lat, lng = excluded.lng;
