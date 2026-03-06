# Database Map

## Source of truth scanned
- Migrations: `supabase/migrations/*.sql`
- Local Supabase config: `supabase/config.toml`

## Multi-tenant strategy
- Primary strategy: shared `public` schema with `tenant_id` discriminator on most operational tables.
- FK pattern: many tables reference `public.tenants(id)` with `on delete cascade`.
- Not tenant-scoped tables (or no `tenant_id`): `order_lines`, `route_stops`, `route_exceptions`, `return_lines`, `tenant_storage_summaries`, `putaway_suggestions`, `inbound_boxes`, `inbound_box_items`.
- RLS: all created tables explicitly set to `disable row level security` in migrations.

## Tables

### Core tenant/admin
- `public.tenants`
  - Purpose: tenant account metadata and plan fields.
  - Key columns: `id` (PK), `name`, `status`, `plan`, `storage_used`, `storage_capacity`, `created_at`.
  - FKs: none.
  - Indexes: PK only.
  - Migration: `20260304024442_init_tenants.sql`.

- `public.users`
  - Purpose: tenant users/employee profiles (app-level roles).
  - Key columns: `id` (PK), `tenant_id`, `name`, `email`, `role`, `active`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `users_tenant_id_idx`.
  - Migration: `20260304033500_init_users.sql`.

- `public.notifications`
  - Purpose: tenant notification feed.
  - Key columns: `id` (PK), `tenant_id`, `type`, `message`, `read`, `created_at`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `notifications_tenant_id_idx`.
  - Migration: `20260304033400_init_notifications.sql`.

### Orders/shipments/payments/events
- `public.orders`
  - Purpose: outbound order headers.
  - Key columns: `id` (PK), `tenant_id`, `order_number`, `status`, `customer`, `destination`, `items`, `route_id`, `delivery_lat`, `delivery_lng`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `orders_tenant_id_idx`.
  - Migrations: `20260304025505_init_orders.sql`, altered by `20260304160000_add_drivers_zones.sql`.

- `public.order_lines`
  - Purpose: line items for orders.
  - Key columns: `id` (PK), `order_id`, `sku`, `quantity`, `location`, `status`.
  - FKs: `order_id -> orders.id`.
  - Indexes: `order_lines_order_id_idx`.

- `public.shipments`
  - Purpose: shipment/tracking records linked to orders.
  - Key columns: `id` (PK), `tenant_id`, `order_id`, `tracking_number`, `carrier`, `status`, `created_at`.
  - FKs: `tenant_id -> tenants.id`, `order_id -> orders.id (set null)`.
  - Indexes: `shipments_tenant_id_idx`, `shipments_order_id_idx`.

- `public.payments`
  - Purpose: payment records and metadata.
  - Key columns: `id` (PK), `tenant_id`, `client_id`, `amount`, `status`, `billing_period`, `plan`, `metadata`, `created_at`.
  - FKs: `tenant_id -> tenants.id`, `client_id -> clients.id (set null)`.
  - Indexes: `payments_tenant_id_idx`, `payments_client_id_idx`.

- `public.events`
  - Purpose: integration/system event ingestion log.
  - Key columns: `id` (PK), `tenant_id`, `source`, `event_type`, `payload`, `received_at`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `events_tenant_id_idx`, `events_event_type_idx`, `events_received_at_idx`.

### Inventory/tasks/returns
- `public.inventory_items`
  - Purpose: SKU inventory by location/client.
  - Key columns: `id` (PK), `tenant_id`, `sku`, `name`, `location`, `status`, `qty`, `min_stock`, `client`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `inventory_items_tenant_id_idx`.

- `public.tasks`
  - Purpose: warehouse operational tasks (pick/pack/putaway/etc).
  - Key columns: `id` (PK), `tenant_id`, `type`, `status`, `assignee`, `location`, `items`, `priority`, `created_at`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `tasks_tenant_id_idx`.

- `public.returns`
  - Purpose: return headers.
  - Key columns: `id` (PK), `tenant_id`, `order_id`, `client`, `status`, `disposition`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `returns_tenant_id_idx`.

- `public.return_lines`
  - Purpose: returned item details.
  - Key columns: `id` (PK), `return_id`, `sku`, `qty`, `condition`.
  - FKs: `return_id -> returns.id`.
  - Indexes: `return_lines_return_id_idx`.

### Routing/dispatch/driver
- `public.routes`
  - Purpose: route headers (driver/vehicle/shift/progress).
  - Key columns: `id` (PK), `tenant_id`, `driver_id`, `driver_name`, `vehicle_id`, `status`, `shift`, `progress`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `routes_tenant_id_idx`.

- `public.route_stops`
  - Purpose: stops under routes.
  - Key columns: `id` (PK), `route_id`, `customer`, `address`, `status`, `packages`, `lat`, `lng`, `weight_kg`, `order_id`.
  - FKs: `route_id -> routes.id`, `order_id -> orders.id (set null)`.
  - Indexes: `route_stops_route_id_idx`, `route_stops_order_id_idx`.
  - Migrations: init + coords + weight + order link.

- `public.route_exceptions`
  - Purpose: route issue tracking.
  - Key columns: `id` (PK), `route_id`, `driver`, `stop_id`, `issue`, `status`.
  - FKs: `route_id -> routes.id`.
  - Indexes: `route_exceptions_route_id_idx`.

- `public.vehicles`
  - Purpose: fleet assets.
  - Key columns: `id` (PK), `tenant_id`, `plate`, `type`, `status`, `max_weight_kg`, `max_packages`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `vehicles_tenant_id_idx`.

- `public.delivery_zones`
  - Purpose: geo radius zones for assignment.
  - Key columns: `id` (PK), `tenant_id`, `location_id`, `name`, `center_lat`, `center_lng`, `radius_km`, `color`.
  - FKs: `tenant_id -> tenants.id`, `location_id -> locations.id`.
  - Indexes: `delivery_zones_tenant_id_idx`.

- `public.drivers`
  - Purpose: driver profiles and assignment limits.
  - Key columns: `id` (PK), `tenant_id`, `name`, `email`, `phone`, `vehicle_id`, `zone_id`, `max_stops`, `status`.
  - FKs: `tenant_id -> tenants.id`, `zone_id -> delivery_zones.id`.
  - Indexes: `drivers_tenant_id_idx`.

- `public.driver_messages`
  - Purpose: threaded driver-dispatcher communication.
  - Key columns: `id` (PK), `tenant_id`, `driver_id`, `route_id`, `parent_id`, `sender_role`, `body`, `status`, `created_at`, `read_at`.
  - FKs: `tenant_id -> tenants.id`, `parent_id -> driver_messages.id`.
  - Indexes: `driver_messages_tenant_idx`, `driver_messages_parent_idx`.

### Storage topology + inbound
- `public.warehouse_zones`
  - Purpose: warehouse zone definitions.
  - Key columns: `id` (PK), `tenant_id`, `warehouse_id`, `name`, `type`, `total_capacity`, `used_capacity`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `warehouse_zones_tenant_id_idx`.

- `public.racks`
  - Purpose: rack definitions in zones.
  - Key columns: `id` (PK), `tenant_id`, `zone_id`, `code`, `level_count`, `bay_count`, `total_capacity`, `used_capacity`, `preferred_client_id`.
  - FKs: `tenant_id -> tenants.id`, `zone_id -> warehouse_zones.id`.
  - Indexes: `racks_zone_id_idx`, `racks_tenant_id_idx`.

- `public.storage_locations`
  - Purpose: bin/location granularity.
  - Key columns: `id` (PK), `tenant_id`, `zone_id`, `rack_id`, `code`, `type`, `max_pallets`, `current_pallets`, `assigned_client_id`.
  - FKs: `tenant_id -> tenants.id`, `zone_id -> warehouse_zones.id`, `rack_id -> racks.id`.
  - Indexes: `storage_locations_rack_id_idx`, `storage_locations_tenant_id_idx`.

- `public.tenant_storage_summaries`
  - Purpose: aggregated storage metrics by client.
  - Key columns: `client_id` (PK), `client_name`, `pallets_stored`, `zones_used`, `racks_used`, `fragmentation_score`, `preferred_zone`, `utilization_percent`.
  - FKs: none declared.
  - Indexes: PK only.

- `public.putaway_suggestions`
  - Purpose: recommended putaway actions.
  - Key columns: `id` (PK), `type`, `message`, `priority`, `action_label`.
  - FKs: none.
  - Indexes: PK only.

- `public.inbound_shipments`
  - Purpose: inbound ASN/receiving header.
  - Key columns: `id` (PK), `tenant_id`, `client_id`, `reference_number`, `carrier`, `status`, `arrival_date`, `dock_door`, `total_pallets`, `created_at`.
  - FKs: `tenant_id -> tenants.id`, `client_id -> clients.id (set null)`.
  - Indexes: `inbound_shipments_tenant_id_idx`, `inbound_shipments_status_idx`.

- `public.inbound_pallets`
  - Purpose: pallets under inbound shipment.
  - Key columns: `id` (PK), `shipment_id`, `tenant_id`, `pallet_number`, `client_id`, `assigned_zone_id`, `assigned_rack_id`, `assigned_location_code`, `status`.
  - FKs: `shipment_id -> inbound_shipments.id`, `tenant_id -> tenants.id`, `client_id -> clients.id (set null)`, `assigned_zone_id -> warehouse_zones.id (set null)`, `assigned_rack_id -> racks.id (set null)`.
  - Indexes: `inbound_pallets_shipment_id_idx`.

- `public.inbound_boxes`
  - Purpose: cartons/boxes on a pallet.
  - Key columns: `id` (PK), `pallet_id`, `box_number`, dimensions/weight.
  - FKs: `pallet_id -> inbound_pallets.id`.
  - Indexes: `inbound_boxes_pallet_id_idx`.

- `public.inbound_box_items`
  - Purpose: SKU contents within inbound boxes.
  - Key columns: `id` (PK), `box_id`, `sku`, `product_name`, `quantity`, unit metrics.
  - FKs: `box_id -> inbound_boxes.id`.
  - Indexes: `inbound_box_items_box_id_idx`.

### Locations/clients/products/billing
- `public.locations`
  - Purpose: tenant site locations (warehouse/etc).
  - Key columns: `id` (PK), `tenant_id`, `name`, `address`, `type`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `locations_tenant_id_idx`.

- `public.clients`
  - Purpose: B2B customer/client accounts.
  - Key columns: `id` (PK), `tenant_id`, `name`, contact fields, `billing_plan`, `status`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `clients_tenant_id_idx`.

- `public.products`
  - Purpose: product/SKU catalog.
  - Key columns: `id` (PK), `tenant_id`, `client_id`, `sku`, `name`, `barcode`, `status`.
  - FKs: `tenant_id -> tenants.id`, `client_id -> clients.id (set null)`.
  - Indexes: `products_tenant_sku_idx` (unique), `products_client_id_idx`.

- `public.invoices`
  - Purpose: tenant invoices.
  - Key columns: `id` (PK), `tenant_id`, `date`, `amount`, `status`, `period`.
  - FKs: `tenant_id -> tenants.id`.
  - Indexes: `invoices_tenant_id_idx`.

## RLS policies
- Found policies: none in scanned migrations.
- Explicit table state: all created tables have `disable row level security` statements.
- Where to verify for runtime policy changes: Supabase dashboard SQL editor or non-committed migrations (`UNKNOWN` in repo).

## Functions/triggers
- SQL functions: none found in scanned migrations.
- SQL triggers: none found in scanned migrations.
