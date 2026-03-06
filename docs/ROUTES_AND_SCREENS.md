# Routes And Screens

## Filesystem routes (Next App Router)
- `/` -> `app/page.tsx` (tab-based app shell with `Topbar`, `Sidebar`, and role-gated screen rendering).
- `/pricing` -> `app/pricing/page.tsx` (marketing pricing page + in-app pricing blurb component in-file).

## In-app tab routes (`?tab=<id>` in `/`)
Source: `config/roleNavigation.ts` + `app/page.tsx` switch.

| Tab id | Screen component | Purpose | Main data fetched | Main mutations | Loading state |
|---|---|---|---|---|---|
| `intro` | `PlatformIntro` | Product overview + recent updates for prospects/internal onboarding. | Mostly static content. | None. | No data loader.
| `tenants` | `TenantsManagement` | Tenant list and volume trend snippets. | `tenants.getTenants`, `tenants.getHistoricVolumeData`. | None found. | Yes (`loading` spinner).
| `dashboard` | `OperationsDashboard` | Ops KPIs, volume, inbound/storage/route summary. | Orders, routes, storage summary, rack occupancy, suggestions, inbound, exceptions. | None. | Yes.
| `inbound` | `InboundManagement` | Inbound receiving workflow (shipments, pallets, boxes, items). | Inbound shipments/pallets/boxes/items, storage zones/racks, clients. | `inbound.createInbound`, `tasks.createTask` (follow-up tasks). | Yes.
| `storage` | `StorageManagement` | Storage analytics and space utilization. | Storage metrics/zones/summaries/suggestions, clients, inventory, racks/locations. | None direct. | Yes.
| `inventory` | `InventoryManagement` | Inventory list, filtering, edits, transfers. | `inventory.getInventoryByTenant`, clients, storage locations. | `inventory.createInventoryItem`, `inventory.updateInventoryItem`, `inventory.deleteInventoryItem`. | Yes.
| `orders` | `OrderManagement` | Order list/detail, order lines, status changes, creation. | Orders by tenant, clients, order lines, shipments by order. | `orders.createOrder`, `orders.updateOrderStatus`; Mapbox geocode call for destination assist. | Yes.
| `tasks` | `TaskCenter` | Warehouse task queue/assignment/status editing. | Tasks by tenant, users by tenant. | `tasks.createTask`, `tasks.updateTaskStatus`, `tasks.updateTask`, `tasks.deleteTask`. | Yes.
| `employees` | `EmployeesManagement` | Tenant employee management. | `users.getUsersByTenant`. | `users.createUser`, `users.updateUser`, `users.deleteUser`. | Yes.
| `returns` | `ReturnsDashboard` | Return lifecycle and disposition. | `returns.getReturnsByTenant`, `returns.getReturnLines`. | `returns.updateReturnDisposition`. | Yes.
| `reports` | `ReportsDashboard` | Business analytics dashboard. | Static in-file datasets (`recharts`), no provider calls. | None. | No async loader.
| `order-reports` | `OrderReports` | Daily order volume and trends with vendor filter. | `supabaseProvider.orders.getOrdersByTenant` (direct provider import). | None. | Yes.
| `billing` | `BillingOverview` | Invoice list and usage estimate cards. | `billing.getInvoicesByTenant`. | No backend payment mutation in current file. | Yes.
| `fleet` | `FleetManagement` | Vehicle/fleet CRUD with driver/location links. | Vehicles, drivers, locations by tenant. | `vehicles.createVehicle`, `vehicles.updateVehicle`, `vehicles.deleteVehicle`. | Yes.
| `dispatcher` | `DispatcherConsole` | Route monitor, exceptions, and driver messaging. | Tenants, routes, vehicles, exceptions, driver messages, route stops. | `messages.replyToMessage`, `messages.markAsRead`. | Yes.
| `routes` | `RouteBoard` | Route board with route stops and exceptions. | Tenants, routes, route exceptions, zones, route stops. | None explicit in screen. | Yes.
| `dispatch-queue` | `DispatchQueue` | Assign packed orders to routes/drivers/vehicles. | Tenants, orders, drivers, vehicles, zones, routes, route stops. | `routes.createRouteStop`, `orders.updateOrderStatus`. | Yes.
| `drivers` | `DriversManagement` | Driver and delivery-zone CRUD + map context. | Tenants, drivers, zones, vehicles. | `drivers.createDriver/updateDriver/deleteDriver`, `zones.createZone/updateZone/deleteZone`. | Yes.
| `settings` | `Settings` | Warehouse config for zones/racks and client affinities. | Storage zones/racks + clients. | `storage.createZone/updateZone/deleteZone`, `storage.createRack/updateRack/deleteRack`. | Yes.
| `worker` | `MobileWorkerApp` | Warehouse-worker simplified task UI. | `tasks.getTasksByTenant`. | `UNKNOWN` in current file (primarily task progression UI). | Yes.
| `driver` | `MobileDriverApp` | Driver stop list, completion, POD-like flow. | Tenants, routes, route stops. | `routes.updateRouteStop`; if linked, `orders.updateOrderStatus("delivered")`. | Yes.
| `tracking` | `ClientPortal` | End-customer tracking portal by order ID. | `orders.getAllOrders`, `orders.getOrderLines`. | None. | Yes.
| `b2b-dashboard` | `B2BDashboard` | B2B client KPIs and shortcuts. | Inventory + orders by tenant. | Navigation action triggers outbound modal. | Yes.
| `b2b-outbound` | `B2BOutbound` | B2B outbound shipment requests. | Mixed static catalog + tenant context; `UNKNOWN` persisted backend write path in current file. | local state submission callback. | No global loader.
| `b2b-products` | `B2BProducts` | B2B product catalog management UI. | Mostly local/static data in file. | local add/edit in state. | No global loader.
| `b2b-reports` | `B2BReports` | B2B report views. | `UNKNOWN` (file not deeply scanned for backend calls). | `UNKNOWN`. | `UNKNOWN`.

## Layout and routing behavior
- `Topbar`: tenant + role switcher, theme toggle, notifications, global database search popup.
- `Sidebar`: grouped section nav by role.
- Role gate check in `app/page.tsx` renders “Access Denied” for unauthorized tabs.
- URL sync:
  - tab from query param on load/popstate.
  - role change resets tab to `ROLE_LANDING_PAGES[role]`.
