import {
  Client,
  DeliveryZone,
  Driver,
  DriverMessage,
  Event,
  InboundBox,
  InboundBoxItem,
  InboundPallet,
  InboundShipment,
  InventoryItem,
  Invoice,
  Location,
  Notification,
  Order,
  OrderLine,
  Payment,
  Product,
  PutawaySuggestion,
  Rack,
  Return,
  ReturnItem,
  Route,
  RouteStop,
  Shipment,
  StorageLocation,
  Task,
  Tenant,
  TenantStorageSummary,
  User,
  Vehicle,
  WarehouseZone
} from "@/types"

export interface TenantsProvider {
  getTenants(): Promise<Tenant[]>
  getTenantById(id: string): Promise<Tenant | undefined>
  getHistoricVolumeData(tenantId: string): Promise<HistoricVolumePoint[]>
}

export interface StorageProvider {
  getDashboardStorageSummary(tenantId: string): Promise<{
    totalCapacity: number
    usedCapacity: number
    occupancyPercent: number
    nearCapacityRacks: number
  }>
  getTopRacksByOccupancy(tenantId: string, limit?: number): Promise<Array<{
    id: string
    code: string
    totalCapacity: number
    usedCapacity: number
    occupancyPercent: number
    palletsStored: number
  }>>
  getWarehouseZones(tenantId: string): Promise<WarehouseZone[]>
  getRacksByZone(tenantId: string, zoneId: string): Promise<Rack[]>
  getAllRacks(tenantId: string): Promise<Rack[]>
  getStorageLocationsByRack(tenantId: string, rackId: string): Promise<StorageLocation[]>
  getStorageSummaryByClient(tenantId: string): Promise<TenantStorageSummary[]>
  getTopFragmentedClients(tenantId: string, limit?: number): Promise<TenantStorageSummary[]>
  getPutawaySuggestions(tenantId: string): Promise<PutawaySuggestion[]>
  getOverallStorageMetrics(tenantId: string): Promise<{
    totalCapacity: number
    usedCapacity: number
    occupancyPercent: number
    emptyLocations: number
    overflowUsage: number
    fragmentedTenants: number
  }>
  createZone(data: { tenantId: string; warehouseId: string; name: string; type: string; color: string; totalCapacity: number }): Promise<WarehouseZone>
  updateZone(zoneId: string, updates: { name?: string; type?: string; color?: string; totalCapacity?: number }): Promise<void>
  deleteZone(zoneId: string): Promise<void>
  createRack(data: { tenantId: string; warehouseId: string; zoneId: string; code: string; side: string; levelCount: number; bayCount: number; totalCapacity: number; preferredClientId?: string }): Promise<Rack>
  updateRack(rackId: string, updates: { code?: string; side?: string; levelCount?: number; bayCount?: number; totalCapacity?: number; preferredClientId?: string | null }): Promise<void>
  deleteRack(rackId: string): Promise<void>
  getAllStorageLocations(tenantId: string): Promise<StorageLocation[]>
}

export interface OrdersProvider {
  getOrdersByTenant(tenantId: string): Promise<Order[]>
  getAllOrders(): Promise<Order[]>
  getOrderLines(orderId: string): Promise<OrderLine[]>
  updateOrderStatus(orderId: string, status: Order["status"], tenantId: string): Promise<void>
  createOrder(data: Omit<Order, "id">): Promise<Order>
}

export interface InventoryProvider {
  getInventoryByTenant(tenantId: string): Promise<InventoryItem[]>
  getAllInventory(): Promise<InventoryItem[]>
  createInventoryItem(data: { tenantId: string; sku: string; name: string; location: string; status: InventoryItem["status"]; qty: number; minStock: number; client: string; productUnits?: number }): Promise<InventoryItem>
  updateInventoryItem(id: string, updates: { sku?: string; name?: string; location?: string; status?: InventoryItem["status"]; qty?: number; minStock?: number; client?: string; productUnits?: number }, tenantId: string): Promise<void>
  deleteInventoryItem(id: string, tenantId: string): Promise<void>
}

export interface TasksProvider {
  getTasksByTenant(tenantId: string): Promise<Task[]>
  getAllTasks(): Promise<Task[]>
  createTask(task: Omit<Task, "id">): Promise<Task>
  updateTaskStatus(taskId: string, status: Task["status"], tenantId: string): Promise<void>
  updateTask(taskId: string, updates: Partial<Omit<Task, "id">>, tenantId: string): Promise<void>
  deleteTask(taskId: string, tenantId: string): Promise<void>
}

export interface InboundProvider {
  getInboundByTenant(tenantId: string): Promise<InboundShipment[]>
  getPalletsByShipment(shipmentId: string): Promise<InboundPallet[]>
  getBoxesByPallet(palletId: string): Promise<InboundBox[]>
  getBoxItems(boxId: string): Promise<InboundBoxItem[]>
  createInbound(payload: Omit<InboundShipment, "id" | "createdAt">): Promise<InboundShipment>
}

export interface RoutesProvider {
  getRoutesByTenant(tenantId: string): Promise<Route[]>
  getAllRoutes(): Promise<Route[]>
  getRouteStops(routeId: string): Promise<RouteStop[]>
  getExceptions(tenantId: string): Promise<RouteException[]>
  createRouteStop(stop: Omit<RouteStop, "id"> & { routeId: string }): Promise<RouteStop>
  updateRouteStop(stopId: string, updates: Partial<RouteStop>, tenantId: string): Promise<void>
}

export interface ReturnsProvider {
  getReturnsByTenant(tenantId: string): Promise<Return[]>
  getAllReturns(): Promise<Return[]>
  getReturnLines(returnId: string): Promise<ReturnItem[]>
  updateReturnDisposition(returnId: string, status: string, disposition: string, tenantId: string): Promise<void>
}

export interface DriversProvider {
  getDriversByTenant(tenantId: string): Promise<Driver[]>
  createDriver(driver: Omit<Driver, "id"> & { tenantId: string }): Promise<Driver>
  updateDriver(driverId: string, updates: Partial<Driver>): Promise<Driver>
  deleteDriver(driverId: string): Promise<void>
}

export interface ZonesProvider {
  getZonesByTenant(tenantId: string): Promise<DeliveryZone[]>
  createZone(zone: Omit<DeliveryZone, "id"> & { tenantId: string }): Promise<DeliveryZone>
  updateZone(zoneId: string, updates: Partial<DeliveryZone>): Promise<DeliveryZone>
  deleteZone(zoneId: string): Promise<void>
}

export interface BillingProvider {
  getInvoicesByTenant(tenantId: string): Promise<Invoice[]>
  getAllInvoices(): Promise<Invoice[]>
}

export interface VehiclesProvider {
  getVehiclesByTenant(tenantId: string): Promise<Vehicle[]>
  getAllVehicles(): Promise<Vehicle[]>
  createVehicle(data: Omit<Vehicle, "id"> & { tenantId: string }): Promise<Vehicle>
  updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle>
  deleteVehicle(vehicleId: string): Promise<void>
}

export interface NotificationsProvider {
  getNotificationsByTenant(tenantId: string): Promise<Notification[]>
}

export interface MessagesProvider {
  getMessagesByTenant(tenantId: string): Promise<DriverMessage[]>
  replyToMessage(parentId: string, tenantId: string, driverId: string, driverName: string, routeId: string | undefined, body: string): Promise<DriverMessage>
  markAsRead(messageId: string): Promise<void>
}

export interface LocationsProvider {
  getLocationsByTenant(tenantId: string): Promise<Location[]>
  getLocationById(id: string): Promise<Location | undefined>
}

export interface ClientsProvider {
  getClientsByTenant(tenantId: string): Promise<Client[]>
  getClientById(id: string): Promise<Client | undefined>
}

export interface ProductsProvider {
  getProductsByTenant(tenantId: string): Promise<Product[]>
  getProductsByClient(tenantId: string, clientId: string): Promise<Product[]>
  getProductBySku(tenantId: string, sku: string): Promise<Product | undefined>
}

export interface ShipmentsProvider {
  getShipmentsByTenant(tenantId: string): Promise<Shipment[]>
  getShipmentsByOrder(orderId: string): Promise<Shipment[]>
}

export interface PaymentsProvider {
  getPaymentsByTenant(tenantId: string): Promise<Payment[]>
  getPaymentsByClient(tenantId: string, clientId: string): Promise<Payment[]>
}

export interface EventsProvider {
  getEventsByTenant(tenantId: string): Promise<Event[]>
  getEventsByType(tenantId: string, eventType: string): Promise<Event[]>
}

export interface UsersProvider {
  getUsersByTenant(tenantId: string): Promise<User[]>
  createUser(user: Omit<User, "id">): Promise<User>
  updateUser(userId: string, updates: Partial<User>): Promise<void>
  deleteUser(userId: string): Promise<void>
}

export interface IDataProvider {
  tenants: TenantsProvider
  storage: StorageProvider
  orders: OrdersProvider
  inventory: InventoryProvider
  tasks: TasksProvider
  routes: RoutesProvider
  returns: ReturnsProvider
  billing: BillingProvider
  vehicles: VehiclesProvider
  notifications: NotificationsProvider
  messages: MessagesProvider
  locations: LocationsProvider
  clients: ClientsProvider
  products: ProductsProvider
  shipments: ShipmentsProvider
  payments: PaymentsProvider
  events: EventsProvider
  inbound: InboundProvider
  drivers: DriversProvider
  zones: ZonesProvider
  users: UsersProvider
}

export type HistoricVolumePoint = {
  date: string
  volume: number
}

export type RouteException = {
  id: string
  tenantId: string
  routeId?: string
  severity: "low" | "medium" | "high"
  title: string
  detail?: string
  createdAt: string
  status?: "open" | "acknowledged" | "resolved"
}
