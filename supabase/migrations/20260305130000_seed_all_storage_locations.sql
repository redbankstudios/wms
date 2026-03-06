-- Seed complete storage locations for all racks so that
-- SUM(current_pallets) per rack equals rack.used_capacity.
-- Previously only 9 sample rows existed; racks had no backing location data.

-- Remove all partial sample rows first
delete from public.storage_locations where tenant_id = 'tenant-1';

-- Generate all locations procedurally via a DO block.
-- Code format: {rack_code}-{side}-{level}-{bay}
-- ID format:   {rack_id}-{level}-{bay:02d}
--
-- Client assignment rules:
--   R-01  (preferred CLT-101 TechCorp)    → all filled locs = CLT-101
--   R-02  (preferred CLT-101 TechCorp)    → all filled locs = CLT-101
--   R-03  (preferred CLT-102 FitLife)     → seq 1-12 filled = CLT-102, seq 13-20 = CLT-103
--   R-04  (no preferred, HomeGoods+Bean)  → seq 1-30 = CLT-104, seq 31-40 = CLT-103
--   R-05  (FP-01, TechCorp fast movers)   → all filled = CLT-101
--   R-06  (FP-02, mixed fast movers)      → seq 1-15 = CLT-101, seq 16-30 = CLT-103, 31-35 = CLT-101
--   R-07  (OV-01, BeanRoasters overflow)  → all filled = CLT-103
--   R-08  (RT-01, returns – no client)    → null
--   empty locations always get null

DO $$
DECLARE
  r         RECORD;
  lvl       INTEGER;
  b         INTEGER;
  seq       INTEGER;
  curr      INTEGER;
  remaining INTEGER;
  client    TEXT;
  loc_code  TEXT;
  loc_id    TEXT;
  max_p CONSTANT INTEGER := 2;
BEGIN
  FOR r IN
    SELECT id, code, side, zone_id, level_count, bay_count, used_capacity
    FROM   public.racks
    WHERE  tenant_id = 'tenant-1'
    ORDER  BY id
  LOOP
    remaining := r.used_capacity;
    seq       := 0;

    FOR lvl IN 1 .. r.level_count LOOP
      FOR b IN 1 .. r.bay_count LOOP
        seq := seq + 1;

        -- Pallet fill: greedy from front
        IF remaining >= max_p THEN
          curr      := max_p;
          remaining := remaining - max_p;
        ELSIF remaining > 0 THEN
          curr      := remaining;
          remaining := 0;
        ELSE
          curr := 0;
        END IF;

        -- Client assignment
        IF curr = 0 THEN
          client := NULL;

        ELSIF r.id = 'R-03' THEN
          IF    seq <= 12 THEN client := 'CLT-102';
          ELSIF seq <= 20 THEN client := 'CLT-103';
          ELSE                  client := NULL;
          END IF;

        ELSIF r.id = 'R-04' THEN
          IF    seq <= 30 THEN client := 'CLT-104';
          ELSIF seq <= 40 THEN client := 'CLT-103';
          ELSE                  client := NULL;
          END IF;

        ELSIF r.id = 'R-06' THEN
          IF    seq <= 15 THEN client := 'CLT-101';
          ELSIF seq <= 30 THEN client := 'CLT-103';
          ELSIF seq <= 35 THEN client := 'CLT-101';
          ELSE                  client := NULL;
          END IF;

        ELSIF r.id = 'R-07' THEN
          client := 'CLT-103';

        ELSIF r.id = 'R-08' THEN
          client := NULL;

        ELSE
          -- R-01, R-02, R-05: use preferred client from racks table
          SELECT preferred_client_id INTO client FROM public.racks WHERE id = r.id;

        END IF;

        loc_code := r.code || '-' || r.side || '-' || lvl || '-' || b;
        loc_id   := r.id   || '-' || lvl    || '-' || LPAD(b::TEXT, 2, '0');

        INSERT INTO public.storage_locations
          (id, tenant_id, warehouse_id, zone_id, rack_id,
           code, level, bay, type,
           max_pallets, current_pallets, utilization_percent, assigned_client_id)
        VALUES
          (loc_id, 'tenant-1', 'WH-01', r.zone_id, r.id,
           loc_code, lvl, b, 'pallet',
           max_p, curr,
           ROUND(curr::NUMERIC / max_p * 100),
           client);

      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Sanity-check: confirm per-rack sums match used_capacity
-- (Uncomment locally to verify, or run in Supabase SQL editor)
-- select r.id, r.used_capacity as expected,
--        coalesce(sum(sl.current_pallets),0) as actual
-- from   public.racks r
-- left join public.storage_locations sl on sl.rack_id = r.id
-- where  r.tenant_id = 'tenant-1'
-- group  by r.id, r.used_capacity
-- order  by r.id;
