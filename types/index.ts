export type Role = "platform_owner" | "business_owner" | "warehouse_manager" | "shipping_manager" | "warehouse_employee" | "packer" | "driver" | "driver_dispatcher" | "b2b_client" | "end_customer";

export interface Tenant {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  status: "active" | "onboarding" | "inactive" | "pending";
  storageUsed: number;
  storageCapacity: number;
  storageLabel?: string;
  plan: string;
  address: string;
  joined: string;
  billingCycle: string;
  paymentMethod: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Vehicle {
  id: string;
  tenantId: string;
  type: string;
  plate: string;
  status: "good" | "needs_service" | "in_repair";
  driver: string;
  location: string;
  lastService: string;
  nextService: string;
  maxWeightKg: number;
  maxPackages: number;
}

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  vehicleId?: string;
  zoneId?: string;
  maxStops: number;
  status: "active" | "off_duty" | "on_leave";
}

export interface DeliveryZone {
  id: string;
  tenantId: string;
  locationId?: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  color: string;
  description?: string;
}

export interface OrderLine {
  id: string;
  sku: string;
  name: string;
  qty: number;
  allocatedQty: number;
}

export interface Order {
  id: string;
  tenantId: string;
  client: string;
  date: string;
  items: number;
  status: "pending" | "allocated" | "picking" | "packed" | "shipped" | "delivered";
  destination: string;
  deliveryLat?: number;
  deliveryLng?: number;
  lines?: OrderLine[];
}

export interface InventoryItem {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  location: string;
  status: "available" | "reserved" | "quarantined" | "pending_receive" | "picked";
  qty: number;
  minStock: number;
  client: string;
  productUnits: number;
}

export interface Task {
  id: string;
  tenantId: string;
  type: "Receive" | "Putaway" | "Pick" | "Pack" | "Return";
  status: "pending" | "in_progress" | "completed";
  assignee: string;
  assigneeId?: string;
  orderId?: string;
  location: string;
  items: number;
  priority: "normal" | "high" | "urgent";
}

export interface RouteStop {
  id: string;
  orderId?: string;
  customer: string;
  address: string;
  time: string;
  status: "pending" | "next" | "completed" | "issue";
  packages: number;
  notes?: string;
  lat?: number;
  lng?: number;
  weightKg?: number;
}

export interface Route {
  id: string;
  tenantId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  status: "planned" | "dispatched" | "on_route" | "completed" | "break" | "available";
  shift: string;
  progress: string;
  stops?: RouteStop[];
}

export interface ReturnItem {
  sku: string;
  name: string;
  qty: number;
  condition: string;
}

export interface Return {
  id: string;
  tenantId: string;
  orderId: string;
  client: string;
  date: string;
  items: number;
  reason: string;
  status: "pending" | "inspecting" | "completed";
  disposition: string;
  lines?: ReturnItem[];
}

export interface Notification {
  id: string;
  tenantId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DriverMessage {
  id: string;
  tenantId: string;
  driverId: string;
  driverName: string;
  routeId?: string;
  parentId?: string;
  senderRole: "driver" | "dispatcher";
  body: string;
  status: "unanswered" | "read" | "replied";
  createdAt: string;
  readAt?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  date: string;
  amount: string;
  status: "paid" | "due" | "overdue";
  period: string;
}

export interface WarehouseZone {
  id: string;
  tenantId: string;
  warehouseId: string;
  name: string;
  type: "reserve" | "forward_pick" | "returns" | "overflow" | "staging";
  color: string;
  totalCapacity: number;
  usedCapacity: number;
}

export interface Rack {
  id: string;
  tenantId: string;
  warehouseId: string;
  zoneId: string;
  code: string;
  side: "A" | "B";
  levelCount: number;
  bayCount: number;
  totalCapacity: number;
  usedCapacity: number;
  preferredClientId?: string;
}

export interface StorageLocation {
  id: string;
  tenantId: string;
  warehouseId: string;
  zoneId: string;
  rackId: string;
  code: string;
  level: number;
  bay: number;
  type: "pallet" | "shelf" | "bin";
  maxPallets: number;
  currentPallets: number;
  utilizationPercent: number;
  assignedClientId?: string;
  assignedProductIds?: string[];
}

export interface StorageOccupancy {
  locationId: string;
  clientId: string;
  palletsStored: number;
  unitsStored: number;
  skuCount: number;
  status: "empty" | "partial" | "full" | "over-capacity";
}

export interface TenantStorageSummary {
  clientId: string;
  clientName: string;
  palletsStored: number;
  zonesUsed: number;
  racksUsed: number;
  fragmentationScore: "low" | "medium" | "high";
  preferredZone: string;
  utilizationPercent: number;
}

export interface PutawaySuggestion {
  id: string;
  type: "consolidation" | "overflow" | "replenishment" | "grouping";
  message: string;
  priority: "low" | "medium" | "high";
  actionLabel: string;
  associatedZoneId?: string;
  associatedRackId?: string;
  associatedClientId?: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  type: "warehouse" | "distribution" | "staging" | "other";
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingPlan: string;
  status: "active" | "inactive" | "pending";
}

export interface Product {
  id: string;
  tenantId: string;
  clientId: string;
  sku: string;
  name: string;
  barcode?: string;
  weight?: string;
  dimensions?: string;
  unitCost?: string;
  status: "active" | "inactive" | "discontinued";
}

export interface Shipment {
  id: string;
  tenantId: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: "pending" | "packed" | "in_transit" | "delivered" | "returned";
  weight?: string;
  dimensions?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  clientId: string;
  amount: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  billingPeriod: string;
  plan: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface Event {
  id: string;
  tenantId: string;
  source: string;
  eventType: string;
  payload?: Record<string, unknown>;
  receivedAt: string;
}

export interface InboundShipment {
  id: string;
  tenantId: string;
  clientId: string;
  referenceNumber: string;
  carrier: string;
  status: "scheduled" | "arrived" | "receiving" | "putaway" | "complete";
  arrivalDate: string;
  arrivalWindowStart: string;
  arrivalWindowEnd: string;
  dockDoor: string;
  notes?: string;
  totalPallets: number;
  createdAt: string;
}

export interface InboundPallet {
  id: string;
  shipmentId: string;
  tenantId: string;
  palletNumber: string;
  clientId: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
  assignedZoneId?: string;
  assignedRackId?: string;
  assignedLocationCode?: string;
  status: "expected" | "arrived" | "receiving" | "putaway";
}

export interface InboundBox {
  id: string;
  palletId: string;
  boxNumber: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
}

export interface InboundBoxItem {
  id: string;
  boxId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitWeight?: string;
  unitDimensions?: string;
}

export interface B2BProduct {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category: string;
  barcode?: string;
  weight?: string;
  dimensions?: string;
  unitCost?: string;
  sellPrice?: string;
  unitsPerCase?: number;
  minStock?: number;
  currentStock?: number;
  status: "active" | "inactive" | "discontinued";
  createdAt: string;
}

export interface B2BOutboundLine {
  id: string;
  shipmentId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitsPerCase: number;
}

export interface B2BOutboundShipment {
  id: string;
  tenantId: string;
  referenceNumber: string;
  carrier: string;
  expectedArrival: string;
  status: "draft" | "scheduled" | "in_transit" | "received" | "cancelled";
  totalPallets: number;
  totalCartons: number;
  notes?: string;
  lines: B2BOutboundLine[];
  createdAt: string;
}
