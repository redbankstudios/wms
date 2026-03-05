"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send, MapPin, Package, Truck, CheckCircle2, AlertCircle, Loader2, RotateCcw,
} from "lucide-react"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import type { Order, Driver, Vehicle, DeliveryZone, Route, RouteStop } from "@/types"
import { autoAssignDriver, type AssignmentResult, type DriverLoad } from "@/lib/autoAssign"

const DispatchMap = dynamic(() => import("./dispatch-map"), { ssr: false })

// ─── Driver color palette (for visual consistency) ─────────────────────────────
const DRIVER_COLORS: Record<string, string> = {
  "DRV-01": "#3b82f6",
  "DRV-02": "#8b5cf6",
  "DRV-03": "#f97316",
  "DRV-04": "#10b981",
  "DRV-05": "#06b6d4",
}
function driverColor(id: string, index: number): string {
  const fallbacks = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#06b6d4", "#ef4444"]
  return DRIVER_COLORS[id] ?? fallbacks[index % fallbacks.length]
}

// ─── Capacity Bar ──────────────────────────────────────────────────────────────
function CapacityBar({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
        <span>{label}</span>
        <span>{used}/{max} {unit}</span>
      </div>
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Order Card ────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order
  assignment: AssignmentResult | null
  overrideDriverId: string | null
  vehicles: Vehicle[]
  drivers: Driver[]
  zones: DeliveryZone[]
  driverLoads: Record<string, DriverLoad>
  isSelected: boolean
  dispatchedDriverId?: string | null
  onSelect: () => void
  onOverride: (driverId: string | null) => void
  onDispatch: () => void
  onUndispatch: () => void
  driverIndex: (id: string) => number
}

function OrderCard({
  order, assignment, overrideDriverId, vehicles, drivers, zones,
  driverLoads, isSelected, dispatchedDriverId, onSelect, onOverride, onDispatch, onUndispatch, driverIndex,
}: OrderCardProps) {
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]))
  const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]))

  const isShipped = order.status === "shipped"
  const isDelivered = order.status === "delivered"

  const effectiveDriverId = overrideDriverId ?? assignment?.driver.id ?? null
  const effectiveDriver = effectiveDriverId ? drivers.find(d => d.id === effectiveDriverId) : null
  const effectiveVehicle = effectiveDriver?.vehicleId ? vehicleMap[effectiveDriver.vehicleId] : null
  const effectiveLoad = effectiveDriverId ? (driverLoads[effectiveDriverId] ?? { stopCount: 0, weightKg: 0, packages: 0 }) : null
  const effectiveZone = effectiveDriver?.zoneId ? zoneMap[effectiveDriver.zoneId] : null
  const effectiveIdx = effectiveDriverId ? driverIndex(effectiveDriverId) : 0

  const borderClass = isSelected
    ? "border-blue-400 ring-2 ring-blue-100"
    : isDelivered
    ? "border-slate-200 bg-slate-50/60 dark:bg-slate-800/40 opacity-75"
    : isShipped
    ? "border-blue-200 bg-blue-50/30 dark:bg-blue-900/10"
    : "hover:border-slate-300"

  return (
    <Card
      className={`cursor-pointer transition-all ${borderClass}`}
      onClick={onSelect}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-mono font-semibold">{order.id}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">{order.client}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
              <MapPin className="h-2.5 w-2.5 flex-none" />
              <span className="truncate">{order.destination}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-none">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Package className="h-3 w-3" />{order.items} pkg
            </div>
            {isShipped && <Badge className="text-[9px] bg-blue-500 px-1.5">In Transit</Badge>}
            {isDelivered && <Badge className="text-[9px] bg-emerald-500 px-1.5">Delivered</Badge>}
          </div>
        </div>

        {/* Packed: assignment + dispatch controls */}
        {!isShipped && !isDelivered && (
          <>
            {effectiveDriver ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ background: driverColor(effectiveDriver.id, effectiveIdx) }}
                  />
                  <span className="text-xs font-medium">{effectiveDriver.name}</span>
                  {effectiveZone && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full border ml-auto"
                      style={{ color: effectiveZone.color, borderColor: effectiveZone.color + "55", background: effectiveZone.color + "15" }}
                    >
                      {effectiveZone.name}
                    </span>
                  )}
                  {assignment && !overrideDriverId && (
                    <Badge variant={assignment.reason === "zone_match" ? "default" : "secondary"} className="text-[9px] ml-1">
                      {assignment.reason === "zone_match" ? "Zone" : "Overflow"}
                    </Badge>
                  )}
                </div>
                {effectiveLoad && effectiveDriver && (
                  <div className="space-y-1">
                    <CapacityBar label="Stops" used={effectiveLoad.stopCount} max={effectiveDriver.maxStops} unit="" />
                    {effectiveVehicle && (
                      <>
                        <CapacityBar label="Weight" used={effectiveLoad.weightKg} max={effectiveVehicle.maxWeightKg} unit="kg" />
                        <CapacityBar label="Packages" used={effectiveLoad.packages} max={effectiveVehicle.maxPackages} unit="" />
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                No driver available — all at capacity
              </div>
            )}
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Select
                value={overrideDriverId ?? "__auto__"}
                onValueChange={v => onOverride(v === "__auto__" ? null : v)}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue placeholder="Override driver…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto ({assignment?.driver.name ?? "none"})</SelectItem>
                  {drivers.filter(d => d.status === "active").map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({driverLoads[d.id]?.stopCount ?? 0}/{d.maxStops} stops)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-7 text-xs flex-none"
                disabled={!effectiveDriver}
                onClick={e => { e.stopPropagation(); onDispatch() }}
              >
                <Send className="h-3 w-3 mr-1" />Add to Route
              </Button>
            </div>
          </>
        )}

        {/* In Transit: driver info + undo */}
        {isShipped && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Truck className="h-3.5 w-3.5" />
              <span>
                In Transit
                {dispatchedDriverId && drivers.find(d => d.id === dispatchedDriverId) && (
                  <> · {drivers.find(d => d.id === dispatchedDriverId)!.name}</>
                )}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={e => { e.stopPropagation(); onUndispatch() }}
            >
              <RotateCcw className="h-2.5 w-2.5 mr-1" />Pending
            </Button>
          </div>
        )}

        {/* Delivered: read-only */}
        {isDelivered && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Delivery confirmed
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function DispatchQueue() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [orders, setOrders] = React.useState<Order[]>([])
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [zones, setZones] = React.useState<DeliveryZone[]>([])
  const [routes, setRoutes] = React.useState<Route[]>([])
  const [allStops, setAllStops] = React.useState<Record<string, RouteStop[]>>({})

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)
  const [overrides, setOverrides] = React.useState<Record<string, string | null>>({})
  const [dispatchedDriverIds, setDispatchedDriverIds] = React.useState<Record<string, string>>({})
  const [filterTab, setFilterTab] = React.useState<"all" | "pending" | "in_transit" | "done">("all")

  // ── Resolve tenant ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function resolve() {
      if (selectedTenant?.id) { setTenantId(selectedTenant.id); return }
      const tenants = await api.tenants.getTenants()
      setTenantId(tenants[0]?.id ?? null)
    }
    resolve()
  }, [api, selectedTenant?.id])

  // ── Load data ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!tenantId) return
    async function load() {
      setLoading(true)
      const [allOrders, driverData, vehicleData, zoneData, routeData] = await Promise.all([
        api.orders.getOrdersByTenant(tenantId!),
        api.drivers.getDriversByTenant(tenantId!),
        api.vehicles.getVehiclesByTenant(tenantId!),
        api.zones.getZonesByTenant(tenantId!),
        api.routes.getRoutesByTenant(tenantId!),
      ])
      const packedOrders = allOrders.filter((o: Order) =>
        o.status === "packed" || o.status === "shipped" || o.status === "delivered"
      )
      setOrders(packedOrders)
      setDrivers(driverData)
      setVehicles(vehicleData)
      setZones(zoneData)
      setRoutes(routeData)

      // Load stops for all routes to compute driver loads
      const stopsRecord: Record<string, RouteStop[]> = {}
      await Promise.all(
        routeData.map(async (r: Route) => {
          stopsRecord[r.id] = await api.routes.getRouteStops(r.id)
        })
      )
      setAllStops(stopsRecord)
      setLoading(false)
    }
    load()
  }, [api, tenantId])

  // ── Compute driver loads from current routes ───────────────────────────────
  const driverLoads: Record<string, DriverLoad> = React.useMemo(() => {
    const loads: Record<string, DriverLoad> = {}
    routes.forEach(route => {
      const stops = allStops[route.id] ?? []
      const stopCount = stops.filter(s => s.status !== "completed").length
      const weightKg = stops.reduce((s, stop) => s + (stop.weightKg ?? 0), 0)
      const packages = stops.reduce((s, stop) => s + stop.packages, 0)
      loads[route.driverId] = { stopCount, weightKg, packages }
    })
    return loads
  }, [routes, allStops])

  // ── Auto-assignment per order ──────────────────────────────────────────────
  const assignments: Record<string, AssignmentResult | null> = React.useMemo(() => {
    const result: Record<string, AssignmentResult | null> = {}
    const accumulatedLoads = { ...driverLoads }
    orders.forEach(order => {
      if (order.status !== "packed") { result[order.id] = null; return }
      if (!order.deliveryLat || !order.deliveryLng) { result[order.id] = null; return }
      const a = autoAssignDriver(
        { lat: order.deliveryLat, lng: order.deliveryLng },
        0, // weight unknown for orders — use 0 (stops/packages are the limiting factor)
        order.items,
        zones,
        drivers.filter(d => d.status === "active"),
        vehicles,
        accumulatedLoads
      )
      result[order.id] = a
      // Accumulate this assignment into loads for subsequent orders
      if (a) {
        const prev = accumulatedLoads[a.driver.id] ?? { stopCount: 0, weightKg: 0, packages: 0 }
        accumulatedLoads[a.driver.id] = {
          stopCount: prev.stopCount + 1,
          weightKg: prev.weightKg,
          packages: prev.packages + order.items,
        }
      }
    })
    return result
  }, [orders, zones, drivers, vehicles, driverLoads])

  // ── Driver index for colors ────────────────────────────────────────────────
  const driverIndex = React.useCallback(
    (id: string) => drivers.findIndex(d => d.id === id),
    [drivers]
  )

  // ── Dispatch an order ──────────────────────────────────────────────────────
  async function dispatchOrder(order: Order) {
    const driverId = overrides[order.id] ?? assignments[order.id]?.driver.id
    if (!driverId) return
    // Try to add a route stop if an active route exists (best-effort)
    const route = routes.find(r => r.driverId === driverId && r.status !== "completed")
    if (route) {
      await api.routes.createRouteStop({
        routeId: route.id,
        orderId: order.id,
        customer: order.client,
        address: order.destination,
        time: "TBD",
        lat: order.deliveryLat,
        lng: order.deliveryLng,
        status: "pending",
        packages: order.items,
      })
    }
    // Update order status to shipped and reflect locally
    await api.orders.updateOrderStatus(order.id, "shipped")
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "shipped" as const } : o))
    setDispatchedDriverIds(prev => ({ ...prev, [order.id]: driverId }))
  }

  // ── Undo a dispatch (return to pending) ────────────────────────────────────
  async function undispatchOrder(order: Order) {
    await api.orders.updateOrderStatus(order.id, "packed")
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "packed" as const } : o))
    setDispatchedDriverIds(prev => { const r = { ...prev }; delete r[order.id]; return r })
  }

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = React.useMemo(() => {
    if (filterTab === "pending") return orders.filter(o => o.status === "packed")
    if (filterTab === "in_transit") return orders.filter(o => o.status === "shipped")
    if (filterTab === "done") return orders.filter(o => o.status === "delivered")
    return orders
  }, [orders, filterTab])

  // ── Map data ───────────────────────────────────────────────────────────────
  const assignedOrderIds = React.useMemo(
    () => new Set(orders.filter(o => o.status === "shipped").map(o => o.id)),
    [orders]
  )
  const driverColorByOrderId: Record<string, string> = {}
  orders.forEach(o => {
    const dId = overrides[o.id] ?? assignments[o.id]?.driver.id ?? dispatchedDriverIds[o.id]
    if (dId) driverColorByOrderId[o.id] = driverColor(dId, driverIndex(dId))
  })

  const pendingCount = orders.filter(o => o.status === "packed").length
  const inTransitCount = orders.filter(o => o.status === "shipped").length
  const doneCount = orders.filter(o => o.status === "delivered").length
  const unassignableCount = orders.filter(o => o.status === "packed" && !assignments[o.id]).length

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-none">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dispatch Queue</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {pendingCount} pending &nbsp;·&nbsp; {inTransitCount} in transit &nbsp;·&nbsp; {doneCount} delivered
            {unassignableCount > 0 && (
              <> &nbsp;·&nbsp; <span className="text-amber-600 font-medium">{unassignableCount} unassignable</span></>
            )}
          </p>
        </div>
        {pendingCount > 0 && (
          <Button
            onClick={async () => {
              for (const order of orders.filter(o => o.status === "packed")) {
                if (assignments[order.id] || overrides[order.id]) {
                  await dispatchOrder(order)
                }
              }
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Dispatch All Assignable
          </Button>
        )}
      </div>

      {/* Main layout */}
      <div className="grid gap-4 md:grid-cols-3 flex-1 min-h-0">
        {/* Orders list */}
        <div className="col-span-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-none">
            <Tabs value={filterTab} onValueChange={v => setFilterTab(v as typeof filterTab)}>
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-xs h-6 px-2">All ({orders.length})</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs h-6 px-2">Pending ({pendingCount})</TabsTrigger>
                <TabsTrigger value="in_transit" className="text-xs h-6 px-2">In Transit ({inTransitCount})</TabsTrigger>
                <TabsTrigger value="done" className="text-xs h-6 px-2">Done ({doneCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            {filteredOrders.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-10">
                {orders.length === 0 ? "No packed orders ready for dispatch" : "No orders in this filter"}
              </div>
            )}
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                assignment={assignments[order.id] ?? null}
                overrideDriverId={overrides[order.id] ?? null}
                vehicles={vehicles}
                drivers={drivers}
                zones={zones}
                driverLoads={driverLoads}
                isSelected={selectedOrderId === order.id}
                dispatchedDriverId={dispatchedDriverIds[order.id] ?? null}
                onSelect={() => setSelectedOrderId(prev => prev === order.id ? null : order.id)}
                onOverride={dId => setOverrides(prev => ({ ...prev, [order.id]: dId }))}
                onDispatch={() => dispatchOrder(order)}
                onUndispatch={() => undispatchOrder(order)}
                driverIndex={driverIndex}
              />
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="col-span-2 rounded-xl border border-slate-200 overflow-hidden min-h-0 relative shadow-sm" style={{ minHeight: "400px" }}>
          {/* Legend */}
          <div className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Legend</p>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping" />Unassigned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />Dispatched
            </span>
            {zones.map(z => (
              <span key={z.id} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: z.color }} />{z.name}
              </span>
            ))}
          </div>

          <DispatchMap
            zones={zones}
            orders={orders.filter(o => o.status !== "delivered")}
            selectedOrderId={selectedOrderId}
            assignedOrderIds={assignedOrderIds}
            driverColorByOrderId={driverColorByOrderId}
            onOrderClick={id => setSelectedOrderId(prev => prev === id ? null : id)}
            drivers={drivers}
          />
        </div>
      </div>
    </div>
  )
}
