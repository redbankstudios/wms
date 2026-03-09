-- =============================================================================
-- Phase 3: Barcode & Unit-of-Measure Foundation
-- Migration: 20260309000002_add_barcode_uom.sql
-- =============================================================================
--
-- Adds three tables:
--
--   uom_definitions        — global catalog of unit-of-measure codes
--   product_barcodes       — one or more barcodes per product, each tied to a UOM
--   product_uom_conversions — tenant/product-specific conversion factors between UOMs
--
-- Existing tables are NOT modified. This migration is purely additive.
-- No existing functionality is broken.
-- =============================================================================

-- ── uom_definitions ──────────────────────────────────────────────────────────
-- Global (no tenant_id). Defines the universe of known unit codes.
-- Products reference these codes by foreign key in barcodes and conversions.

create table if not exists public.uom_definitions (
  code         text        primary key,
  name         text        not null,
  description  text,
  is_base_unit boolean     not null default false
);

alter table public.uom_definitions disable row level security;

-- Standard seed UOMs
insert into public.uom_definitions (code, name, description, is_base_unit) values
  ('each',   'Each',      'Single sellable unit',                     true),
  ('pack',   'Pack',      'Bundle of multiple eaches (e.g. 6-pack)',  false),
  ('case',   'Case',      'Standard carton / case',                   false),
  ('pallet', 'Pallet',    'Full pallet load',                         false),
  ('kg',     'Kilogram',  'Weight — kilograms',                       false),
  ('lb',     'Pound',     'Weight — pounds',                          false),
  ('liter',  'Liter',     'Volume — liters',                          false),
  ('box',    'Box',       'Generic box / inner pack',                 false)
on conflict (code) do nothing;

-- ── product_barcodes ─────────────────────────────────────────────────────────
-- One product may have many barcodes (each, case, pallet all get different barcodes).
-- quantity_per_unit: how many base units this barcode represents when scanned once.

create table if not exists public.product_barcodes (
  id                text        primary key,
  tenant_id         text        not null references public.tenants(id) on delete cascade,
  product_id        text        not null,   -- references public.products(id)
  barcode           text        not null,
  barcode_type      text        not null default 'EAN13',
  -- barcode_type values: EAN13 | EAN8 | UPC | CODE128 | CODE39 | QR | DATAMATRIX

  uom_code          text        not null references public.uom_definitions(code),
  quantity_per_unit integer     not null default 1
    check (quantity_per_unit > 0),
  -- quantity_per_unit: base units per scan of this barcode
  -- e.g. case barcode → quantity_per_unit = 24

  is_primary        boolean     not null default false,
  -- is_primary: the "default" lookup barcode for this product
  -- exactly one barcode per product should be primary

  created_at        timestamptz not null default now(),

  -- A barcode string must be unique within a tenant (no two products share a barcode)
  unique (tenant_id, barcode)
);

create index if not exists product_barcodes_tenant_barcode_idx
  on public.product_barcodes(tenant_id, barcode);

create index if not exists product_barcodes_product_idx
  on public.product_barcodes(tenant_id, product_id);

create index if not exists product_barcodes_primary_idx
  on public.product_barcodes(tenant_id, product_id)
  where is_primary = true;

alter table public.product_barcodes disable row level security;

-- ── product_uom_conversions ──────────────────────────────────────────────────
-- Tenant + product-specific conversion factors.
-- conversion_factor: multiply from_uom qty by this to get to_uom qty.
--
-- Example: case → each, factor = 24  (1 case = 24 eaches)
--          pallet → case, factor = 60 (1 pallet = 60 cases)
--
-- To resolve pallet → each: chain via pallet→case→each = 60 × 24 = 1440

create table if not exists public.product_uom_conversions (
  id                text        primary key,
  tenant_id         text        not null references public.tenants(id) on delete cascade,
  product_id        text        not null,
  from_uom          text        not null references public.uom_definitions(code),
  to_uom            text        not null references public.uom_definitions(code),
  conversion_factor numeric(14, 6) not null
    check (conversion_factor > 0),

  unique (tenant_id, product_id, from_uom, to_uom)
);

create index if not exists product_uom_conversions_product_idx
  on public.product_uom_conversions(tenant_id, product_id);

alter table public.product_uom_conversions disable row level security;

-- =============================================================================
-- Seed example barcode + conversion data for tenant-1 demo products
-- =============================================================================
-- Seed three demo products for tenant-1 using existing inventory_items SKUs.
-- These are illustrative — real barcode data would come from GS1 or product setup.

-- Helper: look up product_id from products table for tenant-1 demo SKUs
-- We use DO $$ blocks so missing product rows don't error the migration.

do $$
declare
  v_product_id text;
begin
  -- Try to find a product for SKU 'SKU-T1-001' (TechCorp Electronics, first item)
  select id into v_product_id
  from public.products
  where tenant_id = 'tenant-1'
  limit 1;

  if v_product_id is not null then
    -- Primary each barcode
    insert into public.product_barcodes
      (id, tenant_id, product_id, barcode, barcode_type, uom_code, quantity_per_unit, is_primary)
    values
      ('PB-DEMO-001', 'tenant-1', v_product_id, '0000000000001', 'EAN13', 'each',   1,    true),
      ('PB-DEMO-002', 'tenant-1', v_product_id, '0000000000002', 'EAN13', 'case',   24,   false),
      ('PB-DEMO-003', 'tenant-1', v_product_id, '0000000000003', 'EAN13', 'pallet', 1440, false)
    on conflict (tenant_id, barcode) do nothing;

    -- Conversions: case→each, pallet→case
    insert into public.product_uom_conversions
      (id, tenant_id, product_id, from_uom, to_uom, conversion_factor)
    values
      ('PUC-DEMO-001', 'tenant-1', v_product_id, 'case',   'each',   24),
      ('PUC-DEMO-002', 'tenant-1', v_product_id, 'pallet', 'case',   60),
      ('PUC-DEMO-003', 'tenant-1', v_product_id, 'pallet', 'each',   1440)
    on conflict (tenant_id, product_id, from_uom, to_uom) do nothing;
  end if;
end $$;
