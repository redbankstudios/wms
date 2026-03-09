# API Surface Discovery

## 1) API architecture reality
- No internal backend API routes exist in this repository:
  - no `app/api/*`
  - no `pages/api/*`
  - no Supabase Edge Functions in `supabase/functions/*`
- Effective backend API is Supabase PostgREST, called directly from browser via:
  - `GET /rest/v1/{table}?...` (`supabaseSelect`)
  - `POST /rest/v1/{table}` (`supabaseInsert`)
  - `PATCH /rest/v1/{table}?...` (`supabasePatch`)
  - `DELETE /rest/v1/{table}?...` (`supabaseDelete`)

## 2) Endpoint inventory (effective backend surface)

## Core / tenant / org
| Endpoint | Method | Provider methods | Parameters | Purpose | Related services/screens |
|---|---|---|---|---|---|
| `/rest/v1/tenants` | GET | `tenants.getTenants`, `tenants.getTenantById` | `id`, order | Tenant list/detail | Topbar, tenant switch, tenants screen |
| `/rest/v1/users` | GET/POST/PATCH/DELETE | `users.getUsersByTenant`, `createUser`, `updateUser`, `deleteUser` | `tenantId`, `userId`, role/quota fields | Workforce user management | Employees, tasks assignment |
| `/rest/v1/locations` | GET | `locations.getLocationsByTenant`, `getLocationById` | `tenantId`, `id` | Warehouse/distribution location metadata | Drivers/zones, settings references |
| `/rest/v1/clients` | GET | `clients.getClientsByTenant`, `getClientById` | `tenantId`, `id` | Tenant client accounts | B2B screens, inbound, products |
| `/rest/v1/products` | GET | `products.getProductsByTenant`, `getProductsByClient`, `getProductBySku` | `tenantId`, `clientId`, `sku` | Product catalog reads | B2B products, topbar search |

## Orders / fulfillment / returns
| Endpoint | Method | Provider methods | Parameters | Purpose | Related services/screens |
|---|---|---|---|---|---|
| `/rest/v1/orders` | GET/POST/PATCH | `orders.getOrdersByTenant`, `getAllOrders`, `createOrder`, `updateOrderStatus` | `tenantId`, `orderId`, status, order payload | Order lifecycle and creation | Dashboard, orders, dispatch queue |
| `/rest/v1/order_lines` | GET | `orders.getOrderLines` | `orderId` | Read order line items | Orders detail |
| `/rest/v1/shipments` | GET | `shipments.getShipmentsByTenant`, `getShipmentsByOrder` | `tenantId`, `orderId` | Shipment/tracking reads | Orders shipped view, tracking context |
| `/rest/v1/returns` | GET/PATCH | `returns.getReturnsByTenant`, `getAllReturns`, `updateReturnDisposition` | `tenantId`, `returnId`, status, disposition | Return workflow updates | Returns dashboard |
| `/rest/v1/return_lines` | GET | `returns.getReturnLines` | `returnId` | Returned SKU line items | Returns details |

## Inventory / warehouse operations
| Endpoint | Method | Provider methods | Parameters | Purpose | Related services/screens |
|---|---|---|---|---|---|
| `/rest/v1/inventory_items` | GET/POST/PATCH/DELETE | `inventory.getInventoryByTenant`, `getAllInventory`, `createInventoryItem`, `updateInventoryItem`, `deleteInventoryItem` | `tenantId`, `id`, SKU/location/status/qty/minStock/productUnits | Inventory snapshots and edits | Inventory, topbar search |
| `/rest/v1/tasks` | GET/POST/PATCH/DELETE | `tasks.getTasksByTenant`, `getAllTasks`, `createTask`, `updateTaskStatus`, `updateTask`, `deleteTask` | `tenantId`, `taskId`, assignment/schedule/quota fields | Operational task orchestration | Tasks, employees, inbound confirm |
| `/rest/v1/warehouse_zones` | GET/POST/PATCH/DELETE | `storage.getWarehouseZones`, `createZone`, `updateZone`, `deleteZone` | `tenantId`, zone IDs, capacity/type/color | Zone topology management | Storage, settings |
| `/rest/v1/racks` | GET/POST/PATCH/DELETE | `storage.getRacksByZone`, `getAllRacks`, `createRack`, `updateRack`, `deleteRack` | `tenantId`, `zoneId`, rack dimensions/capacity/preferredClientId | Rack operations | Storage, inbound location suggestions |
| `/rest/v1/storage_locations` | GET | `storage.getStorageLocationsByRack`, `getAllStorageLocations`, `getTopRacksByOccupancy` | `tenantId`, `rackId` | Slot-level storage visibility | Storage, inventory location picks |
| `/rest/v1/tenant_storage_summaries` | GET | `storage.getStorageSummaryByClient`, `getTopFragmentedClients`, `getOverallStorageMetrics` | currently ignores tenant param in some methods | Aggregated storage analytics | Storage, dashboard |
| `/rest/v1/putaway_suggestions` | GET | `storage.getPutawaySuggestions` | currently ignores tenant param | Suggestion feed for storage optimization | Storage, dashboard |

## Inbound / receiving
| Endpoint | Method | Provider methods | Parameters | Purpose | Related services/screens |
|---|---|---|---|---|---|
| `/rest/v1/inbound_shipments` | GET/POST | `inbound.getInboundByTenant`, `createInbound` | `tenantId`, shipment payload | Inbound header management | Inbound screen |
| `/rest/v1/inbound_pallets` | GET | `inbound.getPalletsByShipment` | `shipmentId` | Pallet-level inbound detail | Inbound pallets tab |
| `/rest/v1/inbound_boxes` | GET | `inbound.getBoxesByPallet` | `palletId` | Box/carton detail | Inbound pallet accordion |
| `/rest/v1/inbound_box_items` | GET | `inbound.getBoxItems` | `boxId` | SKU quantities per inbound box | Inbound detail |

## Transport / dispatch
| Endpoint | Method | Provider methods | Parameters | Purpose | Related services/screens |
|---|---|---|---|---|---|
| `/rest/v1/routes` | GET | `routes.getRoutesByTenant`, `getAllRoutes` | `tenantId` | Route board and dispatch context | Routes, dispatcher, dispatch queue |
| `/rest/v1/route_stops` | GET/POST/PATCH | `routes.getRouteStops`, `createRouteStop`, `updateRouteStop` | `routeId`, `stopId`, stop payload | Stop lifecycle and order delivery linkage | Dispatch queue, mobile driver |
| `/rest/v1/route_exceptions` | GET | `routes.getExceptions` | join filter by `routes.tenant_id` | Exception monitoring | Dashboard, dispatcher |
| `/rest/v1/drivers` | GET/POST/PATCH | `drivers.getDriversByTenant`, `createDriver`, `updateDriver`, `deleteDriver` (soft via status) | `tenantId`, driver profile, `driverId` | Driver roster and assignments | Drivers, dispatch queue |
| `/rest/v1/delivery_zones` | GET/POST/PATCH/DELETE | `zones.getZonesByTenant`, `createZone`, `updateZone`, `deleteZone` | `tenantId`, geo/radius/color fields | Geographic assignment boundaries | Drivers/zones, auto-assign |
| `/rest/v1/vehicles` | GET/POST/PATCH/DELETE | `vehicles.getVehiclesByTenant`, `getAllVehicles`, `createVehicle`, `updateVehicle`, `deleteVehicle` | `tenantId`, capacity/service fields | Fleet capability constraints | Fleet, dispatch queue |
| `/rest/v1/driver_messages` | GET/POST/PATCH | `messages.getMessagesByTenant`, `replyToMessage`, `markAsRead` | `tenantId`, parent/route/driver/message body | Driver-dispatch communication threads | Dispatcher, mobile driver |

## Billing / notifications / events
| Endpoint | Method | Provider methods | Parameters | Purpose | Related services/screens |
|---|---|---|---|---|---|
| `/rest/v1/invoices` | GET | `billing.getInvoicesByTenant`, `getAllInvoices` | `tenantId` | Invoice visibility | Billing overview |
| `/rest/v1/payments` | GET | `payments.getPaymentsByTenant`, `getPaymentsByClient` | `tenantId`, `clientId` | Payment/usage records | Billing/client finance views |
| `/rest/v1/notifications` | GET | `notifications.getNotificationsByTenant` | `tenantId` | Notification feed | Topbar indicator / notification screens |
| `/rest/v1/events` | GET | `events.getEventsByTenant`, `getEventsByType` | `tenantId`, `eventType` | Generic event/audit ingestion reads | No dedicated UI consumer found |

## 3) External APIs called from frontend
- `https://api.mapbox.com/geocoding/v5/mapbox.places/...` (order destination autocomplete in `orders.tsx`)
- Mapbox map tiles/styles via `react-map-gl` in dispatch/driver map components.

## 4) Related service-layer modules (non-HTTP)
- `services/taskAssignmentService.ts`: computes task assignment plans, then applies via `api.tasks.updateTask`.
- `lib/autoAssign.ts`: computes driver assignment based on zone containment + capacity.

## UNKNOWN
- UNKNOWN: whether any private backend gateway exists outside this repo and proxies/enforces these calls in production.
