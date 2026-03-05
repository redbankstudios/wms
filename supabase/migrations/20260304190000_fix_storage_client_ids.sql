-- Fix storage_locations: old "C-101" style IDs → real "CLT-101" style IDs
update public.storage_locations set assigned_client_id = 'CLT-101' where assigned_client_id = 'C-101';
update public.storage_locations set assigned_client_id = 'CLT-102' where assigned_client_id = 'C-102';
update public.storage_locations set assigned_client_id = 'CLT-103' where assigned_client_id = 'C-103';
update public.storage_locations set assigned_client_id = 'CLT-104' where assigned_client_id = 'C-104';

-- Fix tenant_storage_summaries: replace rows with correct client IDs and full names
delete from public.tenant_storage_summaries;

insert into public.tenant_storage_summaries
  (client_id, client_name, pallets_stored, zones_used, racks_used, fragmentation_score, preferred_zone, utilization_percent)
values
  ('CLT-101', 'TechCorp Electronics',  450, 2,  5, 'low',    'Reserve Storage', 92),
  ('CLT-102', 'FitLife Athletics',     120, 1,  2, 'low',    'Reserve Storage', 85),
  ('CLT-103', 'BeanRoasters Coffee',   340, 4, 12, 'high',   'Reserve Storage', 60),
  ('CLT-104', 'HomeGoods Plus',        210, 2,  4, 'medium', 'Forward Pick',    78);
