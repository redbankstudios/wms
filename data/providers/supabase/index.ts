import { IDataProvider, RouteException } from "@/data/providers/IDataProvider"
import { mockProvider } from "@/data/providers/mock"
import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/supabaseRest"
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
  WarehouseZone,
} from "@/types"

export const supabaseProvider: IDataProvider = {
  tenants: {
    getTenants: async () => {
      const data = await supabaseSelect<any>("tenants", "select=*&order=name.asc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        contact: row.contact,
        email: row.email,
        phone: row.phone,
        status: row.status,
        storageUsed: Number(row.storage_used ?? 0),
        storageCapacity: Number(row.storage_capacity ?? 0),
        storageLabel: row.storage_label,
        plan: row.plan,
        address: row.address,
        joined: row.joined,
        billingCycle: row.billing_cycle,
        paymentMethod: row.payment_method,
      })) as Tenant[]
    },
    getTenantById: async (id: string) => {
      const data = await supabaseSelect<any>("tenants", `select=*&id=eq.${id}&limit=1`)
      const row = data?.[0]
      if (!row) return undefined

      return {
        id: row.id,
        name: row.name,
        contact: row.contact,
        email: row.email,
        phone: row.phone,
        status: row.status,
        storageUsed: Number(row.storage_used ?? 0),
        storageCapacity: Number(row.storage_capacity ?? 0),
        storageLabel: row.storage_label,
        plan: row.plan,
        address: row.address,
        joined: row.joined,
        billingCycle: row.billing_cycle,
        paymentMethod: row.payment_method,
      } as Tenant
    },
    getHistoricVolumeData: mockProvider.tenants.getHistoricVolumeData,
  },

  orders: {
    getOrdersByTenant: async (tenantId: string): Promise<Order[]> => {
      const data = await supabaseSelect<any>(
        "orders",
        `select=*&tenant_id=eq.${tenantId}&order=created_at.desc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        client: row.customer,
        date: row.created_at,
        items: row.items ?? 0,
        status: row.status,
        destination: row.destination,
        deliveryLat: row.delivery_lat ?? undefined,
        deliveryLng: row.delivery_lng ?? undefined,
      })) as Order[]
    },
    getAllOrders: async (): Promise<Order[]> => {
      const data = await supabaseSelect<any>("orders", "select=*&order=created_at.desc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        client: row.customer,
        date: row.created_at,
        items: row.items ?? 0,
        status: row.status,
        destination: row.destination,
        deliveryLat: row.delivery_lat ?? undefined,
        deliveryLng: row.delivery_lng ?? undefined,
      })) as Order[]
    },
    getOrderLines: async (orderId: string): Promise<OrderLine[]> => {
      const data = await supabaseSelect<any>(
        "order_lines",
        `select=*&order_id=eq.${orderId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        qty: row.quantity ?? 0,
        allocatedQty: row.status === "allocated" ? (row.quantity ?? 0) : 0,
      })) as OrderLine[]
    },
    updateOrderStatus: async (orderId: string, status: Order["status"]): Promise<void> => {
      await supabasePatch("orders", `id=eq.${orderId}`, { status })
    },
    createOrder: async (data: Omit<Order, "id">): Promise<Order> => {
      const row = await supabaseInsert<any>("orders", {
        tenant_id: data.tenantId,
        customer: data.client,
        items: data.items,
        status: data.status,
        destination: data.destination,
      })
      return { ...data, id: row?.id ?? `ORD-${Date.now()}` }
    },
  },

  inventory: {
    getInventoryByTenant: async (tenantId: string): Promise<InventoryItem[]> => {
      const data = await supabaseSelect<any>(
        "inventory_items",
        `select=*&tenant_id=eq.${tenantId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        sku: row.sku,
        name: row.name,
        location: row.location ?? "",
        status: row.status,
        qty: row.qty ?? 0,
        minStock: row.min_stock ?? 0,
        client: row.client ?? "",
        productUnits: row.product_units ?? 0,
      })) as InventoryItem[]
    },
    getAllInventory: async (): Promise<InventoryItem[]> => {
      const data = await supabaseSelect<any>("inventory_items", "select=*&order=id.asc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        sku: row.sku,
        name: row.name,
        location: row.location ?? "",
        status: row.status,
        qty: row.qty ?? 0,
        minStock: row.min_stock ?? 0,
        client: row.client ?? "",
        productUnits: row.product_units ?? 0,
      })) as InventoryItem[]
    },
    createInventoryItem: async (data) => {
      const id = `INV-${Date.now()}`
      const row = await supabaseInsert<any>("inventory_items", {
        id,
        tenant_id: data.tenantId,
        sku: data.sku,
        name: data.name,
        location: data.location,
        status: data.status,
        qty: data.qty,
        min_stock: data.minStock,
        client: data.client,
        product_units: data.productUnits ?? 0,
      })
      return {
        id: row.id, tenantId: row.tenant_id, sku: row.sku, name: row.name,
        location: row.location ?? "", status: row.status, qty: row.qty ?? 0,
        minStock: row.min_stock ?? 0, client: row.client ?? "",
        productUnits: row.product_units ?? 0,
      } as InventoryItem
    },
    updateInventoryItem: async (id, updates) => {
      const payload: any = {}
      if (updates.sku !== undefined) payload.sku = updates.sku
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.location !== undefined) payload.location = updates.location
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.qty !== undefined) payload.qty = updates.qty
      if (updates.minStock !== undefined) payload.min_stock = updates.minStock
      if (updates.client !== undefined) payload.client = updates.client
      if (updates.productUnits !== undefined) payload.product_units = updates.productUnits
      await supabasePatch("inventory_items", `id=eq.${id}`, payload)
    },
    deleteInventoryItem: async (id) => {
      await supabaseDelete("inventory_items", `id=eq.${id}`)
    },
  },

  tasks: {
    getTasksByTenant: async (tenantId: string): Promise<Task[]> => {
      const data = await supabaseSelect<any>(
        "tasks",
        `select=*&tenant_id=eq.${tenantId}&order=created_at.desc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type,
        status: row.status,
        assignee: row.assignee ?? "",
        location: row.location ?? "",
        items: row.items ?? 0,
        priority: row.priority ?? "normal",
      })) as Task[]
    },
    getAllTasks: async (): Promise<Task[]> => {
      const data = await supabaseSelect<any>("tasks", "select=*&order=created_at.desc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type,
        status: row.status,
        assignee: row.assignee ?? "",
        location: row.location ?? "",
        items: row.items ?? 0,
        priority: row.priority ?? "normal",
      })) as Task[]
    },
    createTask: async (task: Omit<Task, "id">): Promise<Task> => {
      const id = `TSK-${Date.now()}`
      const row = await supabaseInsert<any>("tasks", {
        id,
        tenant_id: task.tenantId,
        type: task.type,
        status: task.status,
        assignee: task.assignee,
        location: task.location,
        items: task.items,
        priority: task.priority,
      })
      return {
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type,
        status: row.status,
        assignee: row.assignee ?? "",
        location: row.location ?? "",
        items: row.items ?? 0,
        priority: row.priority ?? "normal",
      } as Task
    },
    updateTaskStatus: async (taskId: string, status: Task["status"]): Promise<void> => {
      await supabasePatch("tasks", `id=eq.${taskId}`, { status })
    },
    updateTask: async (taskId: string, updates: Partial<Omit<Task, "id">>): Promise<void> => {
      const payload: Record<string, unknown> = {}
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.assignee !== undefined) payload.assignee = updates.assignee
      if (updates.location !== undefined) payload.location = updates.location
      if (updates.items !== undefined) payload.items = updates.items
      if (updates.priority !== undefined) payload.priority = updates.priority
      if (updates.type !== undefined) payload.type = updates.type
      await supabasePatch("tasks", `id=eq.${taskId}`, payload)
    },
    deleteTask: async (taskId: string): Promise<void> => {
      await supabaseDelete("tasks", `id=eq.${taskId}`)
    },
  },

  routes: {
    getRoutesByTenant: async (tenantId: string): Promise<Route[]> => {
      const data = await supabaseSelect<any>(
        "routes",
        `select=*&tenant_id=eq.${tenantId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        driverId: row.driver_id ?? "",
        driverName: row.driver_name ?? "",
        vehicleId: row.vehicle_id ?? "",
        status: row.status,
        shift: row.shift ?? "",
        progress: row.progress ?? "0/0",
      })) as Route[]
    },
    getAllRoutes: async (): Promise<Route[]> => {
      const data = await supabaseSelect<any>("routes", "select=*&order=id.asc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        driverId: row.driver_id ?? "",
        driverName: row.driver_name ?? "",
        vehicleId: row.vehicle_id ?? "",
        status: row.status,
        shift: row.shift ?? "",
        progress: row.progress ?? "0/0",
      })) as Route[]
    },
    getRouteStops: async (routeId: string): Promise<RouteStop[]> => {
      const data = await supabaseSelect<any>(
        "route_stops",
        `select=*&route_id=eq.${routeId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        orderId: row.order_id ?? undefined,
        customer: row.customer ?? "",
        address: row.address ?? "",
        time: row.time ?? "",
        status: row.status,
        packages: row.packages ?? 0,
        notes: row.notes ?? undefined,
        lat: row.lat ?? undefined,
        lng: row.lng ?? undefined,
        weightKg: row.weight_kg ?? undefined,
      })) as RouteStop[]
    },
    getExceptions: async (tenantId: string): Promise<RouteException[]> => {
      const data = await supabaseSelect<any>(
        "route_exceptions",
        `select=*,routes!inner(tenant_id)&routes.tenant_id=eq.${tenantId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId,
        routeId: row.route_id,
        severity: "medium" as const,
        title: row.issue ?? "Routing exception",
        detail: row.customer ? `${row.customer}${row.stop_id ? ` • ${row.stop_id}` : ""}` : undefined,
        createdAt: row.time ?? new Date().toISOString(),
        status: row.status === "resolved" ? "resolved" as const : "open" as const,
      })) as RouteException[]
    },
    createRouteStop: async (stop: Omit<RouteStop, "id"> & { routeId: string }): Promise<RouteStop> => {
      const id = `STP-${Date.now()}`
      const row = await supabaseInsert<any>("route_stops", {
        id,
        route_id: stop.routeId,
        order_id: stop.orderId ?? null,
        customer: stop.customer,
        address: stop.address,
        time: stop.time ?? "",
        status: stop.status ?? "pending",
        packages: stop.packages ?? 0,
        notes: stop.notes ?? null,
        lat: stop.lat ?? null,
        lng: stop.lng ?? null,
        weight_kg: stop.weightKg ?? null,
      })
      return {
        id: row.id,
        orderId: row.order_id ?? undefined,
        customer: row.customer ?? "",
        address: row.address ?? "",
        time: row.time ?? "",
        status: row.status,
        packages: row.packages ?? 0,
        notes: row.notes ?? undefined,
        lat: row.lat ?? undefined,
        lng: row.lng ?? undefined,
        weightKg: row.weight_kg ?? undefined,
      } as RouteStop
    },
    updateRouteStop: async (stopId: string, updates: Partial<RouteStop>): Promise<void> => {
      const payload: Record<string, unknown> = {}
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.notes !== undefined) payload.notes = updates.notes
      if (updates.packages !== undefined) payload.packages = updates.packages
      if (updates.weightKg !== undefined) payload.weight_kg = updates.weightKg
      await supabasePatch("route_stops", `id=eq.${stopId}`, payload)
    },
  },

  returns: {
    getReturnsByTenant: async (tenantId: string): Promise<Return[]> => {
      const data = await supabaseSelect<any>(
        "returns",
        `select=*&tenant_id=eq.${tenantId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        orderId: row.order_id ?? "",
        client: row.client ?? "",
        date: row.date ?? "",
        items: row.items ?? 0,
        reason: row.reason ?? "",
        status: row.status,
        disposition: row.disposition ?? "-",
      })) as Return[]
    },
    getAllReturns: async (): Promise<Return[]> => {
      const data = await supabaseSelect<any>("returns", "select=*&order=id.asc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        orderId: row.order_id ?? "",
        client: row.client ?? "",
        date: row.date ?? "",
        items: row.items ?? 0,
        reason: row.reason ?? "",
        status: row.status,
        disposition: row.disposition ?? "-",
      })) as Return[]
    },
    updateReturnDisposition: async (returnId: string, status: string, disposition: string): Promise<void> => {
      await supabasePatch("returns", `id=eq.${returnId}`, { status, disposition })
    },
    getReturnLines: async (returnId: string): Promise<ReturnItem[]> => {
      const data = await supabaseSelect<any>(
        "return_lines",
        `select=*&return_id=eq.${returnId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        sku: row.sku ?? "",
        name: row.name ?? "",
        qty: row.qty ?? 0,
        condition: row.condition ?? "",
      })) as ReturnItem[]
    },
  },

  billing: {
    getInvoicesByTenant: async (tenantId: string): Promise<Invoice[]> => {
      const data = await supabaseSelect<any>(
        "invoices",
        `select=*&tenant_id=eq.${tenantId}&order=date.desc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        date: row.date ?? "",
        amount: row.amount ?? "",
        status: row.status,
        period: row.period ?? "",
      })) as Invoice[]
    },
    getAllInvoices: async (): Promise<Invoice[]> => {
      const data = await supabaseSelect<any>("invoices", "select=*&order=date.desc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        date: row.date ?? "",
        amount: row.amount ?? "",
        status: row.status,
        period: row.period ?? "",
      })) as Invoice[]
    },
  },

  vehicles: {
    getVehiclesByTenant: async (tenantId: string): Promise<Vehicle[]> => {
      const data = await supabaseSelect<any>(
        "vehicles",
        `select=*&tenant_id=eq.${tenantId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type ?? "",
        plate: row.plate ?? "",
        status: row.status,
        driver: row.driver ?? "",
        location: row.location ?? "",
        lastService: row.last_service ?? "",
        nextService: row.next_service ?? "",
        maxWeightKg: row.max_weight_kg ?? 1000,
        maxPackages: row.max_packages ?? 200,
      })) as Vehicle[]
    },
    getAllVehicles: async (): Promise<Vehicle[]> => {
      const data = await supabaseSelect<any>("vehicles", "select=*&order=id.asc")

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type ?? "",
        plate: row.plate ?? "",
        status: row.status,
        driver: row.driver ?? "",
        location: row.location ?? "",
        lastService: row.last_service ?? "",
        nextService: row.next_service ?? "",
        maxWeightKg: row.max_weight_kg ?? 1000,
        maxPackages: row.max_packages ?? 200,
      })) as Vehicle[]
    },
    createVehicle: async (data: Omit<Vehicle, "id"> & { tenantId: string }): Promise<Vehicle> => {
      const row = await supabaseInsert<any>("vehicles", {
        tenant_id: data.tenantId,
        type: data.type,
        plate: data.plate,
        status: data.status,
        driver: data.driver,
        location: data.location,
        last_service: data.lastService,
        next_service: data.nextService,
        max_weight_kg: data.maxWeightKg,
        max_packages: data.maxPackages,
      })
      return { ...data, id: row?.id ?? `VEH-${Date.now()}` }
    },
    updateVehicle: async (vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
      const patch: Record<string, unknown> = {}
      if (updates.type !== undefined) patch.type = updates.type
      if (updates.plate !== undefined) patch.plate = updates.plate
      if (updates.status !== undefined) patch.status = updates.status
      if (updates.driver !== undefined) patch.driver = updates.driver
      if (updates.location !== undefined) patch.location = updates.location
      if (updates.lastService !== undefined) patch.last_service = updates.lastService
      if (updates.nextService !== undefined) patch.next_service = updates.nextService
      if (updates.maxWeightKg !== undefined) patch.max_weight_kg = updates.maxWeightKg
      if (updates.maxPackages !== undefined) patch.max_packages = updates.maxPackages
      await supabasePatch("vehicles", `id=eq.${vehicleId}`, patch)
      const rows = await supabaseSelect<any>("vehicles", `select=*&id=eq.${vehicleId}&limit=1`)
      const row = rows[0]
      return {
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type ?? "",
        plate: row.plate ?? "",
        status: row.status,
        driver: row.driver ?? "",
        location: row.location ?? "",
        lastService: row.last_service ?? "",
        nextService: row.next_service ?? "",
        maxWeightKg: row.max_weight_kg ?? 1000,
        maxPackages: row.max_packages ?? 200,
      }
    },
    deleteVehicle: async (vehicleId: string): Promise<void> => {
      await supabaseDelete("vehicles", `id=eq.${vehicleId}`)
    },
  },

  notifications: {
    getNotificationsByTenant: async (tenantId: string): Promise<Notification[]> => {
      const data = await supabaseSelect<any>(
        "notifications",
        `select=*&tenant_id=eq.${tenantId}&order=created_at.desc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        type: row.type ?? "",
        message: row.message ?? "",
        read: row.read ?? false,
        createdAt: row.created_at ?? "",
      })) as Notification[]
    },
  },

  messages: {
    getMessagesByTenant: async (tenantId: string): Promise<DriverMessage[]> => {
      const data = await supabaseSelect<any>(
        "driver_messages",
        `select=*&tenant_id=eq.${tenantId}&order=created_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        driverId: row.driver_id,
        driverName: row.driver_name,
        routeId: row.route_id ?? undefined,
        parentId: row.parent_id ?? undefined,
        senderRole: row.sender_role,
        body: row.body,
        status: row.status,
        createdAt: row.created_at,
        readAt: row.read_at ?? undefined,
      })) as DriverMessage[]
    },
    replyToMessage: async (parentId: string, tenantId: string, driverId: string, driverName: string, routeId: string | undefined, body: string): Promise<DriverMessage> => {
      const replyId = `MSG-${Date.now()}`
      const now = new Date().toISOString()
      const row = await supabaseInsert<any>("driver_messages", {
        id: replyId,
        tenant_id: tenantId,
        driver_id: driverId,
        driver_name: driverName,
        route_id: routeId ?? null,
        parent_id: parentId,
        sender_role: "dispatcher",
        body,
        status: "replied",
        created_at: now,
        read_at: null,
      })
      await supabasePatch("driver_messages", `id=eq.${parentId}`, { status: "replied" })
      return {
        id: row.id,
        tenantId: row.tenant_id,
        driverId: row.driver_id,
        driverName: row.driver_name,
        routeId: row.route_id ?? undefined,
        parentId: row.parent_id ?? undefined,
        senderRole: row.sender_role,
        body: row.body,
        status: row.status,
        createdAt: row.created_at,
        readAt: row.read_at ?? undefined,
      }
    },
    markAsRead: async (messageId: string): Promise<void> => {
      await supabasePatch("driver_messages", `id=eq.${messageId}`, {
        status: "read",
        read_at: new Date().toISOString(),
      })
    },
  },

  storage: {
    getWarehouseZones: async (tenantId: string): Promise<WarehouseZone[]> => {
      const data = await supabaseSelect<any>(
        "warehouse_zones",
        `select=*&tenant_id=eq.${tenantId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        warehouseId: row.warehouse_id,
        name: row.name,
        type: row.type,
        color: row.color ?? "",
        totalCapacity: row.total_capacity ?? 0,
        usedCapacity: row.used_capacity ?? 0,
      })) as WarehouseZone[]
    },
    getRacksByZone: async (tenantId: string, zoneId: string): Promise<Rack[]> => {
      const data = await supabaseSelect<any>(
        "racks",
        `select=*&tenant_id=eq.${tenantId}&zone_id=eq.${zoneId}&order=id.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        warehouseId: row.warehouse_id,
        zoneId: row.zone_id,
        code: row.code,
        side: row.side,
        levelCount: row.level_count ?? 0,
        bayCount: row.bay_count ?? 0,
        totalCapacity: row.total_capacity ?? 0,
        usedCapacity: row.used_capacity ?? 0,
        preferredClientId: row.preferred_client_id ?? undefined,
      })) as Rack[]
    },
    getStorageLocationsByRack: async (tenantId: string, rackId: string): Promise<StorageLocation[]> => {
      const data = await supabaseSelect<any>(
        "storage_locations",
        `select=*&tenant_id=eq.${tenantId}&rack_id=eq.${rackId}&order=level.asc,bay.asc`
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        warehouseId: row.warehouse_id,
        zoneId: row.zone_id,
        rackId: row.rack_id,
        code: row.code,
        level: row.level ?? 0,
        bay: row.bay ?? 0,
        type: row.type,
        maxPallets: row.max_pallets ?? 0,
        currentPallets: row.current_pallets ?? 0,
        utilizationPercent: row.utilization_percent ?? 0,
        assignedClientId: row.assigned_client_id ?? undefined,
      })) as StorageLocation[]
    },
    getStorageSummaryByClient: async (_tenantId: string): Promise<TenantStorageSummary[]> => {
      const data = await supabaseSelect<any>(
        "tenant_storage_summaries",
        "select=*&order=pallets_stored.desc"
      )

      return (data ?? []).map((row: any) => ({
        clientId: row.client_id,
        clientName: row.client_name,
        palletsStored: row.pallets_stored ?? 0,
        zonesUsed: row.zones_used ?? 0,
        racksUsed: row.racks_used ?? 0,
        fragmentationScore: row.fragmentation_score,
        preferredZone: row.preferred_zone ?? "",
        utilizationPercent: row.utilization_percent ?? 0,
      })) as TenantStorageSummary[]
    },
    getTopFragmentedClients: async (_tenantId: string, limit = 2): Promise<TenantStorageSummary[]> => {
      const data = await supabaseSelect<any>(
        "tenant_storage_summaries",
        "select=*&order=pallets_stored.desc"
      )

      const scoreRank: Record<TenantStorageSummary["fragmentationScore"], number> = {
        high: 3,
        medium: 2,
        low: 1,
      }

      return (data ?? [])
        .map((row: any) => ({
          clientId: row.client_id,
          clientName: row.client_name,
          palletsStored: row.pallets_stored ?? 0,
          zonesUsed: row.zones_used ?? 0,
          racksUsed: row.racks_used ?? 0,
          fragmentationScore: row.fragmentation_score as TenantStorageSummary["fragmentationScore"],
          preferredZone: row.preferred_zone ?? "",
          utilizationPercent: row.utilization_percent ?? 0,
        }))
        .sort((a: TenantStorageSummary, b: TenantStorageSummary) =>
          scoreRank[b.fragmentationScore] - scoreRank[a.fragmentationScore]
        )
        .slice(0, limit) as TenantStorageSummary[]
    },
    getPutawaySuggestions: async (_tenantId: string): Promise<PutawaySuggestion[]> => {
      const data = await supabaseSelect<any>(
        "putaway_suggestions",
        "select=*&order=id.asc"
      )

      return (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        priority: row.priority,
        actionLabel: row.action_label ?? "",
        associatedZoneId: row.associated_zone_id ?? undefined,
        associatedRackId: row.associated_rack_id ?? undefined,
        associatedClientId: row.associated_client_id ?? undefined,
      })) as PutawaySuggestion[]
    },
    getDashboardStorageSummary: async (tenantId: string) => {
      const [zones, racks] = await Promise.all([
        supabaseSelect<any>("warehouse_zones", `select=*&tenant_id=eq.${tenantId}`),
        supabaseSelect<any>("racks", `select=*&tenant_id=eq.${tenantId}`),
      ])

      let totalCapacity = 0
      let usedCapacity = 0

      ;(zones ?? []).forEach((z: any) => {
        totalCapacity += z.total_capacity ?? 0
        usedCapacity += z.used_capacity ?? 0
      })

      const occupancyPercent = totalCapacity > 0
        ? Math.round((usedCapacity / totalCapacity) * 100)
        : 0

      const nearCapacityRacks = (racks ?? []).filter(
        (r: any) => r.total_capacity > 0 && (r.used_capacity / r.total_capacity) >= 0.9
      ).length

      return { totalCapacity, usedCapacity, occupancyPercent, nearCapacityRacks }
    },
    getTopRacksByOccupancy: async (tenantId: string, limit = 6) => {
      const [racks, locations] = await Promise.all([
        supabaseSelect<any>("racks", `select=*&tenant_id=eq.${tenantId}`),
        supabaseSelect<any>("storage_locations", `select=*&tenant_id=eq.${tenantId}`),
      ])

      const palletsByRack = new Map<string, number>()
      ;(locations ?? []).forEach((loc: any) => {
        palletsByRack.set(loc.rack_id, (palletsByRack.get(loc.rack_id) ?? 0) + (loc.current_pallets ?? 0))
      })

      return (racks ?? [])
        .map((rack: any) => {
          const occupancyPercent = rack.total_capacity > 0
            ? Math.round((rack.used_capacity / rack.total_capacity) * 100)
            : 0
          const palletsStored = palletsByRack.get(rack.id) ?? 0

          return {
            id: rack.id,
            code: rack.code,
            totalCapacity: rack.total_capacity ?? 0,
            usedCapacity: rack.used_capacity ?? 0,
            occupancyPercent,
            palletsStored: palletsStored > 0 ? palletsStored : rack.used_capacity ?? 0,
          }
        })
        .sort((a: any, b: any) => b.occupancyPercent - a.occupancyPercent)
        .slice(0, limit)
    },
    getOverallStorageMetrics: async (tenantId: string) => {
      const [zones, summaries] = await Promise.all([
        supabaseSelect<any>("warehouse_zones", `select=*&tenant_id=eq.${tenantId}`),
        supabaseSelect<any>("tenant_storage_summaries", "select=fragmentation_score"),
      ])

      let totalCapacity = 0
      let usedCapacity = 0

      ;(zones ?? []).forEach((z: any) => {
        totalCapacity += z.total_capacity ?? 0
        usedCapacity += z.used_capacity ?? 0
      })

      const occupancyPercent = totalCapacity > 0
        ? Math.round((usedCapacity / totalCapacity) * 100)
        : 0
      const emptyLocations = totalCapacity - usedCapacity

      const overflowZone = (zones ?? []).find((z: any) => z.type === "overflow")
      const overflowUsage = overflowZone ? (overflowZone.used_capacity ?? 0) : 0

      const fragmentedTenants = (summaries ?? []).filter(
        (t: any) => t.fragmentation_score === "high"
      ).length

      return { totalCapacity, usedCapacity, occupancyPercent, emptyLocations, overflowUsage, fragmentedTenants }
    },
    getAllRacks: async (tenantId: string): Promise<Rack[]> => {
      const data = await supabaseSelect<any>("racks", `select=*&tenant_id=eq.${tenantId}&order=zone_id.asc,id.asc`)
      return (data ?? []).map((row: any) => ({
        id: row.id, tenantId: row.tenant_id, warehouseId: row.warehouse_id,
        zoneId: row.zone_id, code: row.code, side: row.side,
        levelCount: row.level_count ?? 0, bayCount: row.bay_count ?? 0,
        totalCapacity: row.total_capacity ?? 0, usedCapacity: row.used_capacity ?? 0,
        preferredClientId: row.preferred_client_id ?? undefined,
      })) as Rack[]
    },
    createZone: async (data) => {
      const id = `Z-${Date.now()}`
      const row = await supabaseInsert<any>("warehouse_zones", {
        id, tenant_id: data.tenantId, warehouse_id: data.warehouseId,
        name: data.name, type: data.type, color: data.color,
        total_capacity: data.totalCapacity, used_capacity: 0,
      })
      return { id: row.id, tenantId: row.tenant_id, warehouseId: row.warehouse_id,
        name: row.name, type: row.type, color: row.color ?? "",
        totalCapacity: row.total_capacity ?? 0, usedCapacity: row.used_capacity ?? 0 } as WarehouseZone
    },
    updateZone: async (zoneId, updates) => {
      const payload: Record<string, unknown> = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.type !== undefined) payload.type = updates.type
      if (updates.color !== undefined) payload.color = updates.color
      if (updates.totalCapacity !== undefined) payload.total_capacity = updates.totalCapacity
      await supabasePatch("warehouse_zones", `id=eq.${zoneId}`, payload)
    },
    deleteZone: async (zoneId) => {
      await supabaseDelete("warehouse_zones", `id=eq.${zoneId}`)
    },
    createRack: async (data) => {
      const id = `R-${Date.now()}`
      const row = await supabaseInsert<any>("racks", {
        id, tenant_id: data.tenantId, warehouse_id: data.warehouseId,
        zone_id: data.zoneId, code: data.code, side: data.side,
        level_count: data.levelCount, bay_count: data.bayCount,
        total_capacity: data.totalCapacity, used_capacity: 0,
        preferred_client_id: data.preferredClientId ?? null,
      })
      return { id: row.id, tenantId: row.tenant_id, warehouseId: row.warehouse_id,
        zoneId: row.zone_id, code: row.code, side: row.side,
        levelCount: row.level_count ?? 0, bayCount: row.bay_count ?? 0,
        totalCapacity: row.total_capacity ?? 0, usedCapacity: row.used_capacity ?? 0,
        preferredClientId: row.preferred_client_id ?? undefined } as Rack
    },
    updateRack: async (rackId, updates) => {
      const payload: Record<string, unknown> = {}
      if (updates.code !== undefined) payload.code = updates.code
      if (updates.side !== undefined) payload.side = updates.side
      if (updates.levelCount !== undefined) payload.level_count = updates.levelCount
      if (updates.bayCount !== undefined) payload.bay_count = updates.bayCount
      if (updates.totalCapacity !== undefined) payload.total_capacity = updates.totalCapacity
      if ("preferredClientId" in updates) payload.preferred_client_id = updates.preferredClientId ?? null
      await supabasePatch("racks", `id=eq.${rackId}`, payload)
    },
    deleteRack: async (rackId) => {
      await supabaseDelete("racks", `id=eq.${rackId}`)
    },
    getAllStorageLocations: async (tenantId: string): Promise<StorageLocation[]> => {
      const data = await supabaseSelect<any>("storage_locations", `select=*&tenant_id=eq.${tenantId}&order=code.asc`)
      return (data ?? []).map((row: any) => ({
        id: row.id, tenantId: row.tenant_id, warehouseId: row.warehouse_id,
        zoneId: row.zone_id, rackId: row.rack_id, code: row.code,
        level: row.level, bay: row.bay, type: row.type,
        maxPallets: row.max_pallets ?? 0, currentPallets: row.current_pallets ?? 0,
        utilizationPercent: row.utilization_percent ?? 0,
        assignedClientId: row.assigned_client_id ?? undefined,
      })) as StorageLocation[]
    },
  },

  locations: {
    getLocationsByTenant: async (tenantId: string): Promise<Location[]> => {
      const data = await supabaseSelect<any>(
        "locations",
        `select=*&tenant_id=eq.${tenantId}&order=name.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        address: row.address ?? "",
        type: row.type,
      })) as Location[]
    },
    getLocationById: async (id: string): Promise<Location | undefined> => {
      const data = await supabaseSelect<any>("locations", `select=*&id=eq.${id}&limit=1`)
      const row = data?.[0]
      if (!row) return undefined
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        address: row.address ?? "",
        type: row.type,
      } as Location
    },
  },

  clients: {
    getClientsByTenant: async (tenantId: string): Promise<Client[]> => {
      const data = await supabaseSelect<any>(
        "clients",
        `select=*&tenant_id=eq.${tenantId}&order=name.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        contactName: row.contact_name ?? "",
        contactEmail: row.contact_email ?? "",
        contactPhone: row.contact_phone ?? "",
        billingPlan: row.billing_plan ?? "",
        status: row.status,
      })) as Client[]
    },
    getClientById: async (id: string): Promise<Client | undefined> => {
      const data = await supabaseSelect<any>("clients", `select=*&id=eq.${id}&limit=1`)
      const row = data?.[0]
      if (!row) return undefined
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        contactName: row.contact_name ?? "",
        contactEmail: row.contact_email ?? "",
        contactPhone: row.contact_phone ?? "",
        billingPlan: row.billing_plan ?? "",
        status: row.status,
      } as Client
    },
  },

  products: {
    getProductsByTenant: async (tenantId: string): Promise<Product[]> => {
      const data = await supabaseSelect<any>(
        "products",
        `select=*&tenant_id=eq.${tenantId}&order=sku.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        sku: row.sku,
        name: row.name,
        barcode: row.barcode ?? undefined,
        weight: row.weight ?? undefined,
        dimensions: row.dimensions ?? undefined,
        unitCost: row.unit_cost ?? undefined,
        status: row.status,
      })) as Product[]
    },
    getProductsByClient: async (tenantId: string, clientId: string): Promise<Product[]> => {
      const data = await supabaseSelect<any>(
        "products",
        `select=*&tenant_id=eq.${tenantId}&client_id=eq.${clientId}&order=sku.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        sku: row.sku,
        name: row.name,
        barcode: row.barcode ?? undefined,
        weight: row.weight ?? undefined,
        dimensions: row.dimensions ?? undefined,
        unitCost: row.unit_cost ?? undefined,
        status: row.status,
      })) as Product[]
    },
    getProductBySku: async (tenantId: string, sku: string): Promise<Product | undefined> => {
      const data = await supabaseSelect<any>(
        "products",
        `select=*&tenant_id=eq.${tenantId}&sku=eq.${sku}&limit=1`
      )
      const row = data?.[0]
      if (!row) return undefined
      return {
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        sku: row.sku,
        name: row.name,
        barcode: row.barcode ?? undefined,
        weight: row.weight ?? undefined,
        dimensions: row.dimensions ?? undefined,
        unitCost: row.unit_cost ?? undefined,
        status: row.status,
      } as Product
    },
  },

  shipments: {
    getShipmentsByTenant: async (tenantId: string): Promise<Shipment[]> => {
      const data = await supabaseSelect<any>(
        "shipments",
        `select=*&tenant_id=eq.${tenantId}&order=created_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        orderId: row.order_id ?? "",
        trackingNumber: row.tracking_number ?? "",
        carrier: row.carrier ?? "",
        status: row.status,
        weight: row.weight ?? undefined,
        dimensions: row.dimensions ?? undefined,
        createdAt: row.created_at ?? "",
      })) as Shipment[]
    },
    getShipmentsByOrder: async (orderId: string): Promise<Shipment[]> => {
      const data = await supabaseSelect<any>(
        "shipments",
        `select=*&order_id=eq.${orderId}&order=created_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        orderId: row.order_id ?? "",
        trackingNumber: row.tracking_number ?? "",
        carrier: row.carrier ?? "",
        status: row.status,
        weight: row.weight ?? undefined,
        dimensions: row.dimensions ?? undefined,
        createdAt: row.created_at ?? "",
      })) as Shipment[]
    },
  },

  payments: {
    getPaymentsByTenant: async (tenantId: string): Promise<Payment[]> => {
      const data = await supabaseSelect<any>(
        "payments",
        `select=*&tenant_id=eq.${tenantId}&order=created_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        amount: row.amount ?? "",
        status: row.status,
        billingPeriod: row.billing_period ?? "",
        plan: row.plan ?? "",
        metadata: row.metadata ?? undefined,
        createdAt: row.created_at ?? "",
      })) as Payment[]
    },
    getPaymentsByClient: async (tenantId: string, clientId: string): Promise<Payment[]> => {
      const data = await supabaseSelect<any>(
        "payments",
        `select=*&tenant_id=eq.${tenantId}&client_id=eq.${clientId}&order=created_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        amount: row.amount ?? "",
        status: row.status,
        billingPeriod: row.billing_period ?? "",
        plan: row.plan ?? "",
        metadata: row.metadata ?? undefined,
        createdAt: row.created_at ?? "",
      })) as Payment[]
    },
  },

  events: {
    getEventsByTenant: async (tenantId: string): Promise<Event[]> => {
      const data = await supabaseSelect<any>(
        "events",
        `select=*&tenant_id=eq.${tenantId}&order=received_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        source: row.source ?? "",
        eventType: row.event_type ?? "",
        payload: row.payload ?? undefined,
        receivedAt: row.received_at ?? "",
      })) as Event[]
    },
    getEventsByType: async (tenantId: string, eventType: string): Promise<Event[]> => {
      const data = await supabaseSelect<any>(
        "events",
        `select=*&tenant_id=eq.${tenantId}&event_type=eq.${eventType}&order=received_at.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        source: row.source ?? "",
        eventType: row.event_type ?? "",
        payload: row.payload ?? undefined,
        receivedAt: row.received_at ?? "",
      })) as Event[]
    },
  },

  inbound: {
    getInboundByTenant: async (tenantId: string): Promise<InboundShipment[]> => {
      const data = await supabaseSelect<any>(
        "inbound_shipments",
        `select=*&tenant_id=eq.${tenantId}&order=arrival_date.desc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        referenceNumber: row.reference_number ?? "",
        carrier: row.carrier ?? "",
        status: row.status,
        arrivalDate: row.arrival_date ?? "",
        arrivalWindowStart: row.arrival_window_start ?? "",
        arrivalWindowEnd: row.arrival_window_end ?? "",
        dockDoor: row.dock_door ?? "",
        notes: row.notes ?? undefined,
        totalPallets: row.total_pallets ?? 0,
        createdAt: row.created_at ?? "",
      })) as InboundShipment[]
    },
    getPalletsByShipment: async (shipmentId: string): Promise<InboundPallet[]> => {
      const data = await supabaseSelect<any>(
        "inbound_pallets",
        `select=*&shipment_id=eq.${shipmentId}&order=pallet_number.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        shipmentId: row.shipment_id,
        tenantId: row.tenant_id,
        palletNumber: row.pallet_number,
        clientId: row.client_id ?? "",
        length: row.length ?? undefined,
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        weight: row.weight ?? undefined,
        assignedZoneId: row.assigned_zone_id ?? undefined,
        assignedRackId: row.assigned_rack_id ?? undefined,
        assignedLocationCode: row.assigned_location_code ?? undefined,
        status: row.status,
      })) as InboundPallet[]
    },
    getBoxesByPallet: async (palletId: string): Promise<InboundBox[]> => {
      const data = await supabaseSelect<any>(
        "inbound_boxes",
        `select=*&pallet_id=eq.${palletId}&order=box_number.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        palletId: row.pallet_id,
        boxNumber: row.box_number,
        length: row.length ?? undefined,
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        weight: row.weight ?? undefined,
      })) as InboundBox[]
    },
    getBoxItems: async (boxId: string): Promise<InboundBoxItem[]> => {
      const data = await supabaseSelect<any>(
        "inbound_box_items",
        `select=*&box_id=eq.${boxId}&order=id.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        boxId: row.box_id,
        sku: row.sku,
        productName: row.product_name,
        quantity: row.quantity ?? 0,
        unitWeight: row.unit_weight ?? undefined,
        unitDimensions: row.unit_dimensions ?? undefined,
      })) as InboundBoxItem[]
    },
    createInbound: async (payload: Omit<InboundShipment, "id" | "createdAt">): Promise<InboundShipment> => {
      const id = `INB-${Date.now()}`
      const row = await supabaseInsert<any>("inbound_shipments", {
        id,
        tenant_id: payload.tenantId,
        client_id: payload.clientId,
        reference_number: payload.referenceNumber,
        carrier: payload.carrier,
        status: payload.status,
        arrival_date: payload.arrivalDate,
        arrival_window_start: payload.arrivalWindowStart,
        arrival_window_end: payload.arrivalWindowEnd,
        dock_door: payload.dockDoor,
        notes: payload.notes,
        total_pallets: payload.totalPallets,
      })
      return {
        id: row.id,
        tenantId: row.tenant_id,
        clientId: row.client_id ?? "",
        referenceNumber: row.reference_number ?? "",
        carrier: row.carrier ?? "",
        status: row.status,
        arrivalDate: row.arrival_date ?? "",
        arrivalWindowStart: row.arrival_window_start ?? "",
        arrivalWindowEnd: row.arrival_window_end ?? "",
        dockDoor: row.dock_door ?? "",
        notes: row.notes ?? undefined,
        totalPallets: row.total_pallets ?? 0,
        createdAt: row.created_at ?? "",
      } as InboundShipment
    },
  },

  drivers: {
    getDriversByTenant: async (tenantId: string): Promise<Driver[]> => {
      const data = await supabaseSelect<any>(
        "drivers",
        `select=*&tenant_id=eq.${tenantId}&order=name.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        vehicleId: row.vehicle_id ?? undefined,
        zoneId: row.zone_id ?? undefined,
        maxStops: row.max_stops ?? 15,
        status: row.status ?? "active",
      })) as Driver[]
    },
    createDriver: async (driver: Omit<Driver, "id"> & { tenantId: string }): Promise<Driver> => {
      const id = `DRV-${Date.now()}`
      const row = await supabaseInsert<any>("drivers", {
        id,
        tenant_id: driver.tenantId,
        name: driver.name,
        email: driver.email ?? null,
        phone: driver.phone ?? null,
        vehicle_id: driver.vehicleId ?? null,
        zone_id: driver.zoneId ?? null,
        max_stops: driver.maxStops,
        status: driver.status,
      })
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        vehicleId: row.vehicle_id ?? undefined,
        zoneId: row.zone_id ?? undefined,
        maxStops: row.max_stops ?? 15,
        status: row.status ?? "active",
      } as Driver
    },
    updateDriver: async (driverId: string, updates: Partial<Driver>): Promise<Driver> => {
      const payload: Record<string, unknown> = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.email !== undefined) payload.email = updates.email
      if (updates.phone !== undefined) payload.phone = updates.phone
      if (updates.vehicleId !== undefined) payload.vehicle_id = updates.vehicleId
      if (updates.zoneId !== undefined) payload.zone_id = updates.zoneId
      if (updates.maxStops !== undefined) payload.max_stops = updates.maxStops
      if (updates.status !== undefined) payload.status = updates.status
      await supabasePatch("drivers", `id=eq.${driverId}`, payload)
      const data = await supabaseSelect<any>("drivers", `select=*&id=eq.${driverId}&limit=1`)
      const row = data?.[0]
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        vehicleId: row.vehicle_id ?? undefined,
        zoneId: row.zone_id ?? undefined,
        maxStops: row.max_stops ?? 15,
        status: row.status ?? "active",
      } as Driver
    },
    deleteDriver: async (driverId: string): Promise<void> => {
      await supabasePatch("drivers", `id=eq.${driverId}`, { status: "on_leave" })
    },
  },

  zones: {
    getZonesByTenant: async (tenantId: string): Promise<DeliveryZone[]> => {
      const data = await supabaseSelect<any>(
        "delivery_zones",
        `select=*&tenant_id=eq.${tenantId}&order=name.asc`
      )
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        locationId: row.location_id ?? undefined,
        name: row.name,
        centerLat: row.center_lat,
        centerLng: row.center_lng,
        radiusKm: row.radius_km,
        color: row.color,
        description: row.description ?? undefined,
      })) as DeliveryZone[]
    },
    createZone: async (zone: Omit<DeliveryZone, "id"> & { tenantId: string }): Promise<DeliveryZone> => {
      const id = `DZ-${Date.now()}`
      const row = await supabaseInsert<any>("delivery_zones", {
        id,
        tenant_id: zone.tenantId,
        location_id: zone.locationId ?? null,
        name: zone.name,
        center_lat: zone.centerLat,
        center_lng: zone.centerLng,
        radius_km: zone.radiusKm,
        color: zone.color,
        description: zone.description ?? null,
      })
      return {
        id: row.id,
        tenantId: row.tenant_id,
        locationId: row.location_id ?? undefined,
        name: row.name,
        centerLat: row.center_lat,
        centerLng: row.center_lng,
        radiusKm: row.radius_km,
        color: row.color,
        description: row.description ?? undefined,
      } as DeliveryZone
    },
    updateZone: async (zoneId: string, updates: Partial<DeliveryZone>): Promise<DeliveryZone> => {
      const payload: Record<string, unknown> = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.centerLat !== undefined) payload.center_lat = updates.centerLat
      if (updates.centerLng !== undefined) payload.center_lng = updates.centerLng
      if (updates.radiusKm !== undefined) payload.radius_km = updates.radiusKm
      if (updates.color !== undefined) payload.color = updates.color
      if (updates.description !== undefined) payload.description = updates.description
      await supabasePatch("delivery_zones", `id=eq.${zoneId}`, payload)
      const data = await supabaseSelect<any>("delivery_zones", `select=*&id=eq.${zoneId}&limit=1`)
      const row = data?.[0]
      return {
        id: row.id,
        tenantId: row.tenant_id,
        locationId: row.location_id ?? undefined,
        name: row.name,
        centerLat: row.center_lat,
        centerLng: row.center_lng,
        radiusKm: row.radius_km,
        color: row.color,
        description: row.description ?? undefined,
      } as DeliveryZone
    },
    deleteZone: async (zoneId: string): Promise<void> => {
      await supabaseDelete("delivery_zones", `id=eq.${zoneId}`)
    },
  },

  users: {
    getUsersByTenant: async (tenantId: string): Promise<User[]> => {
      const data = await supabaseSelect<any>("users", `select=*&tenant_id=eq.${tenantId}&order=name.asc`)
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        email: row.email ?? "",
        role: row.role,
        active: row.active ?? true,
      })) as User[]
    },
    createUser: async (user: Omit<User, "id">): Promise<User> => {
      const id = `USR-${Date.now()}`
      const row = await supabaseInsert<any>("users", {
        id,
        tenant_id: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active ?? true,
      })
      return { id: row.id, tenantId: row.tenant_id, name: row.name, email: row.email ?? "", role: row.role, active: row.active } as User
    },
    updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
      const payload: Record<string, unknown> = {}
      if (updates.name   !== undefined) payload.name   = updates.name
      if (updates.email  !== undefined) payload.email  = updates.email
      if (updates.role   !== undefined) payload.role   = updates.role
      if (updates.active !== undefined) payload.active = updates.active
      await supabasePatch("users", `id=eq.${userId}`, payload)
    },
    deleteUser: async (userId: string): Promise<void> => {
      await supabaseDelete("users", `id=eq.${userId}`)
    },
  },
}
