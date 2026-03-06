-- Fix racks.preferred_client_id: seed used C-* format; clients table uses CLT-* format
update public.racks set preferred_client_id = 'CLT-101' where preferred_client_id = 'C-101';
update public.racks set preferred_client_id = 'CLT-102' where preferred_client_id = 'C-102';
update public.racks set preferred_client_id = 'CLT-103' where preferred_client_id = 'C-103';
update public.racks set preferred_client_id = 'CLT-104' where preferred_client_id = 'C-104';
