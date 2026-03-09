import { IDataProvider, RouteException } from "@/data/providers/IDataProvider"
import { billingService } from "@/services/billingService"
import { driverService } from "@/services/driverService"
import { inventoryService } from "@/services/inventoryService"
import { mockDriverMessages } from "@/mock/driverMessages"
import { notificationService } from "@/services/notificationService"
import { orderService } from "@/services/orderService"
import { returnsService } from "@/services/returnsService"
import { routeService } from "@/services/routeService"
import { storageService } from "@/services/storageService"
import { taskService } from "@/services/taskService"
import { tenantService } from "@/services/tenantService"
import { userService } from "@/services/userService"
import { vehicleService } from "@/services/vehicleService"
import { zoneService } from "@/services/zoneService"
import { DriverMessage, RouteStop } from "@/types"

// In-memory store for mock messages (supports optimistic mutations)
let mockMessagesStore: DriverMessage[] = [...mockDriverMessages]

// In-memory route stops for mock mutations
let mockStopStore: (RouteStop & { routeId: string })[] = []

export const mockProvider: IDataProvider = {
  tenants: {
    getTenants: tenantService.getTenants,
    getTenantById: tenantService.getTenantById,
    getHistoricVolumeData: async (tenantId: string) => {
      const data = await tenantService.getHistoricVolumeData(tenantId)
      return data.map((item: any, index: number) => ({
        date: item?.date ?? item?.month ?? item?.label ?? String(index),
        volume: item?.volume ?? 0,
      }))
    },
  },
  storage: {
    getDashboardStorageSummary: storageService.getDashboardStorageSummary,
    getTopRacksByOccupancy: storageService.getTopRacksByOccupancy,
    getWarehouseZones: storageService.getWarehouseZones,
    getRacksByZone: storageService.getRacksByZone,
    getAllRacks: async (_tenantId: string) => [],
    getStorageLocationsByRack: storageService.getStorageLocationsByRack,
    getStorageSummaryByClient: storageService.getStorageSummaryByClient,
    getTopFragmentedClients: storageService.getTopFragmentedClients,
    getPutawaySuggestions: storageService.getPutawaySuggestions,
    getOverallStorageMetrics: storageService.getOverallStorageMetrics,
    createZone: async (_data: any) => { throw new Error("Not implemented in mock") },
    updateZone: async (_zoneId: string, _updates: any) => {},
    deleteZone: async (_zoneId: string) => {},
    createRack: async (_data: any) => { throw new Error("Not implemented in mock") },
    updateRack: async (_rackId: string, _updates: any) => {},
    deleteRack: async (_rackId: string) => {},
    getAllStorageLocations: storageService.getAllStorageLocations,
  },
  orders: {
    getOrdersByTenant: orderService.getOrdersByTenant,
    getAllOrders: orderService.getAllOrders,
    getOrderLines: orderService.getOrderLines,
    updateOrderStatus: async (_orderId: string, _status: any, _tenantId: string) => {
      // mock: optimistic update handled in UI
    },
    createOrder: async (data: any) => {
      return { ...data, id: `ORD-${Date.now()}` }
    },
  },
  inventory: {
    getInventoryByTenant: inventoryService.getInventoryByTenant,
    getAllInventory: inventoryService.getAllInventory,
    createInventoryItem: async (_data: any) => { throw new Error("Not implemented in mock") },
    updateInventoryItem: async (_id: string, _updates: any, _tenantId: string) => {},
    deleteInventoryItem: async (_id: string, _tenantId: string) => {},
  },
  tasks: {
    getTasksByTenant: taskService.getTasksByTenant.bind(taskService),
    getAllTasks: taskService.getAllTasks.bind(taskService),
    createTask: taskService.createTask.bind(taskService),
    updateTaskStatus: async (taskId: string, status: any, _tenantId: string) =>
      taskService.updateTaskStatus(taskId, status),
    updateTask: async (taskId: string, updates: any, _tenantId: string) =>
      taskService.updateTask(taskId, updates),
    deleteTask: async (taskId: string, _tenantId: string) =>
      taskService.deleteTask(taskId),
  },
  routes: {
    getRoutesByTenant: routeService.getRoutesByTenant,
    getAllRoutes: routeService.getAllRoutes,
    getRouteStops: async (routeId: string) => {
      const base = await routeService.getRouteStops(routeId)
      const added = mockStopStore.filter(s => s.routeId === routeId)
      return [...base, ...added]
    },
    getExceptions: async (tenantId: string): Promise<RouteException[]> => {
      const exceptions = await routeService.getExceptions()
      const hasTenantId = exceptions.some((item: any) => Boolean(item?.tenantId))

      if (hasTenantId) {
        return (exceptions as RouteException[]).filter(item => item.tenantId === tenantId)
      }

      return (exceptions as any[]).map((item, index) => ({
        id: item.id ?? `EXC-${index + 1}`,
        tenantId,
        routeId: item.route ?? item.routeId,
        severity: "medium",
        title: item.issue ?? item.title ?? "Routing exception",
        detail: item.customer ? `${item.customer}${item.stop ? ` • ${item.stop}` : ""}` : item.detail,
        createdAt: item.time ?? new Date().toISOString(),
        status: item.status === "resolved" ? "resolved" : "open",
      }))
    },
    createRouteStop: async (stop: Omit<RouteStop, "id"> & { routeId: string }): Promise<RouteStop> => {
      const newStop = { ...stop, id: `STP-${Date.now()}` }
      mockStopStore = [...mockStopStore, newStop]
      return newStop
    },
    updateRouteStop: async (_stopId: string, _updates: Partial<RouteStop>, _tenantId: string): Promise<void> => {
      // mock: optimistic update handled in UI
    },
  },
  returns: {
    getReturnsByTenant: returnsService.getReturnsByTenant,
    getAllReturns: returnsService.getAllReturns,
    getReturnLines: returnsService.getReturnLines,
    updateReturnDisposition: async (_returnId: string, _status: string, _disposition: string, _tenantId: string) => {
      // mock: optimistic update handled in UI
    },
  },
  billing: {
    getInvoicesByTenant: billingService.getInvoicesByTenant,
    getAllInvoices: billingService.getAllInvoices,
  },
  vehicles: {
    getVehiclesByTenant: vehicleService.getVehiclesByTenant,
    getAllVehicles: vehicleService.getAllVehicles,
    createVehicle: vehicleService.createVehicle,
    updateVehicle: vehicleService.updateVehicle,
    deleteVehicle: vehicleService.deleteVehicle,
  },
  notifications: {
    getNotificationsByTenant: notificationService.getNotificationsByTenant,
  },
  messages: {
    getMessagesByTenant: async (tenantId: string): Promise<DriverMessage[]> => {
      return mockMessagesStore.filter(m => m.tenantId === tenantId)
    },
    replyToMessage: async (parentId: string, tenantId: string, driverId: string, driverName: string, routeId: string | undefined, body: string): Promise<DriverMessage> => {
      const reply: DriverMessage = {
        id: `MSG-${Date.now()}`,
        tenantId,
        driverId,
        driverName,
        routeId,
        parentId,
        senderRole: "dispatcher",
        body,
        status: "replied",
        createdAt: new Date().toISOString(),
        readAt: undefined,
      }
      mockMessagesStore = mockMessagesStore.map(m =>
        m.id === parentId ? { ...m, status: "replied" } : m
      )
      mockMessagesStore = [reply, ...mockMessagesStore]
      return reply
    },
    markAsRead: async (messageId: string): Promise<void> => {
      mockMessagesStore = mockMessagesStore.map(m =>
        m.id === messageId ? { ...m, status: "read", readAt: new Date().toISOString() } : m
      )
    },
  },
  locations: {
    getLocationsByTenant: async (_tenantId: string) => [],
    getLocationById: async (_id: string) => undefined,
  },
  clients: {
    getClientsByTenant: async (_tenantId: string) => [],
    getClientById: async (_id: string) => undefined,
  },
  products: {
    getProductsByTenant: async (_tenantId: string) => [],
    getProductsByClient: async (_tenantId: string, _clientId: string) => [],
    getProductBySku: async (_tenantId: string, _sku: string) => undefined,
  },
  shipments: {
    getShipmentsByTenant: async (_tenantId: string) => [],
    getShipmentsByOrder: async (_orderId: string) => [],
  },
  payments: {
    getPaymentsByTenant: async (_tenantId: string) => [],
    getPaymentsByClient: async (_tenantId: string, _clientId: string) => [],
  },
  events: {
    getEventsByTenant: async (_tenantId: string) => [],
    getEventsByType: async (_tenantId: string, _eventType: string) => [],
  },
  inbound: {
    getInboundByTenant: async (_tenantId: string) => [],
    getPalletsByShipment: async (_shipmentId: string) => [],
    getBoxesByPallet: async (_palletId: string) => [],
    getBoxItems: async (_boxId: string) => [],
    createInbound: async (_payload: any) => ({ ..._payload, id: `INB-${Date.now()}`, createdAt: new Date().toISOString() }),
  },
  drivers: {
    getDriversByTenant: driverService.getDriversByTenant,
    createDriver: driverService.createDriver,
    updateDriver: driverService.updateDriver,
    deleteDriver: driverService.deleteDriver,
  },
  zones: {
    getZonesByTenant: zoneService.getZonesByTenant,
    createZone: zoneService.createZone,
    updateZone: zoneService.updateZone,
    deleteZone: zoneService.deleteZone,
  },
  users: {
    getUsersByTenant: userService.getUsersByTenant,
    createUser: userService.createUser,
    updateUser: userService.updateUser,
    deleteUser: userService.deleteUser,
  },
}
