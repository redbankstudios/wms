-- Add structured context columns to putaway_suggestions so modals can autofill
alter table public.putaway_suggestions
  add column if not exists associated_zone_id text,
  add column if not exists associated_rack_id text,
  add column if not exists associated_client_id text;

-- S-01: BeanRoasters consolidation → target Zone Z-01 (Reserve), client CLT-103
update public.putaway_suggestions set
  associated_zone_id  = 'Z-01',
  associated_rack_id  = null,
  associated_client_id = 'CLT-103'
where id = 'S-01';

-- S-02: TechCorp overflow → source rack R-02, redirect to Z-03 (Overflow), client CLT-101
update public.putaway_suggestions set
  associated_zone_id   = 'Z-03',
  associated_rack_id   = 'R-02',
  associated_client_id = 'CLT-101'
where id = 'S-02';

-- S-03: Forward Pick replenishment → zone Z-02, client CLT-101 (TechCorp fast movers)
update public.putaway_suggestions set
  associated_zone_id   = 'Z-02',
  associated_rack_id   = null,
  associated_client_id = 'CLT-101'
where id = 'S-03';

-- S-04: Returns zone clearing → zone Z-04
update public.putaway_suggestions set
  associated_zone_id   = 'Z-04',
  associated_rack_id   = null,
  associated_client_id = null
where id = 'S-04';

-- S-05: FitLife rack assignment → rack R-03, client CLT-102
update public.putaway_suggestions set
  associated_zone_id   = 'Z-01',
  associated_rack_id   = 'R-03',
  associated_client_id = 'CLT-102'
where id = 'S-05';
