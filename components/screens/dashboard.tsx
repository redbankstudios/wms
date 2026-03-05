"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, Clock, AlertTriangle, Loader2, Database, Layers, Percent } from "lucide-react"
import { useDemo } from "@/context/DemoContext"
import { getProvider } from "@/data"

export function OperationsDashboard() {
  const { selectedTenant } = useDemo()
  const api = React.useMemo(() => getProvider(), [])
  const [statusFilter, setStatusFilter] = React.useState("All")
  const [orders, setOrders] = React.useState<any[]>([])
  const [routes, setRoutes] = React.useState<any[]>([])
  const [storageSummary, setStorageSummary] = React.useState<{
    totalCapacity: number
    usedCapacity: number
    occupancyPercent: number
    nearCapacityRacks: number
  } | null>(null)
  const [putawaySuggestions, setPutawaySuggestions] = React.useState<any[]>([])
  const [fragmentationAlerts, setFragmentationAlerts] = React.useState<any[]>([])
  const [topRacks, setTopRacks] = React.useState<Array<{
    id: string
    code: string
    totalCapacity: number
    usedCapacity: number
    occupancyPercent: number
    palletsStored: number
  }>>([])
  const [incomingPallets, setIncomingPallets] = React.useState(0)
  const [activeInboundCount, setActiveInboundCount] = React.useState(0)
  const [openExceptions, setOpenExceptions] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const tenantId = selectedTenant.id

  const navigate = React.useCallback((tab: string) => {
    window.history.pushState(null, "", `/?tab=${tab}`)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, [])

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [o, r, s, racks, suggestions, fragmented, inboundShipments, exceptions] = await Promise.all([
        api.orders.getOrdersByTenant(tenantId),
        api.routes.getRoutesByTenant(tenantId),
        api.storage.getDashboardStorageSummary(tenantId),
        api.storage.getTopRacksByOccupancy(tenantId, 6),
        api.storage.getPutawaySuggestions(tenantId),
        api.storage.getTopFragmentedClients(tenantId, 2),
        api.inbound.getInboundByTenant(tenantId),
        api.routes.getExceptions(tenantId),
      ])
      setOrders(o)
      setRoutes(r)
      setStorageSummary(s)
      setTopRacks(racks)
      setPutawaySuggestions(suggestions)
      setFragmentationAlerts(fragmented)
      const activeShipments = inboundShipments.filter((sh: any) => sh.status !== "complete")
      const pallets = activeShipments.reduce((sum: number, sh: any) => sum + (sh.totalPallets ?? 0), 0)
      setIncomingPallets(pallets)
      setActiveInboundCount(activeShipments.length)
      const openExc = exceptions.filter((e: any) => e.status !== "resolved").length
      setOpenExceptions(openExc)
      setLoading(false)
    }
    loadData()
  }, [api, tenantId])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  // Derived metrics
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "allocated" || o.status === "picking").length
  const dispatchedRoutes = routes.filter(r => r.status === "on_route" || r.status === "completed").length
  const totalRoutes = routes.length
  const totalCapacityDisplay = storageSummary ? storageSummary.totalCapacity.toLocaleString() : "—"
  const usedCapacityDisplay = storageSummary ? storageSummary.usedCapacity.toLocaleString() : "—"
  const occupancyDisplay = storageSummary ? `${storageSummary.occupancyPercent}%` : "—"
  const nearCapacityDisplay = storageSummary ? storageSummary.nearCapacityRacks.toLocaleString() : "—"

  const filteredShipments = orders.filter(order =>
    statusFilter === "All" || order.status.toLowerCase() === statusFilter.toLowerCase()
  )

  const getRackStatus = (occupancyPercent: number) => {
    if (occupancyPercent >= 95) return { label: "Full", className: "bg-rose-100 text-rose-700" }
    if (occupancyPercent >= 80) return { label: "Near Full", className: "bg-amber-100 text-amber-700" }
    return { label: "Healthy", className: "bg-emerald-100 text-emerald-700" }
  }

  const getSuggestionSeverity = (suggestion: any) => {
    const priority = suggestion?.priority
    if (priority === "high") return { label: "High", className: "bg-rose-100 text-rose-700" }
    if (priority === "medium") return { label: "Medium", className: "bg-amber-100 text-amber-700" }
    if (priority === "low") return { label: "Low", className: "bg-emerald-100 text-emerald-700" }
    const type = suggestion?.type
    if (type === "overflow" || type === "consolidation") return { label: "High", className: "bg-rose-100 text-rose-700" }
    if (type === "replenishment") return { label: "Medium", className: "bg-amber-100 text-amber-700" }
    return { label: "Low", className: "bg-emerald-100 text-emerald-700" }
  }

  const priorityWeight = (priority: string | undefined) => {
    if (priority === "high") return 3
    if (priority === "medium") return 2
    if (priority === "low") return 1
    return 0
  }
  const topSuggestions = [...putawaySuggestions]
    .sort((a, b) => priorityWeight(b?.priority) - priorityWeight(a?.priority))
    .slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Operations Dashboard</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Last updated: Just now</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => navigate("inbound")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming Pallets</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incomingPallets}</div>
            <p className="text-xs text-slate-500">Across {activeInboundCount} active shipment{activeInboundCount !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => navigate("orders")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Awaiting</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-slate-500">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => navigate("routes")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routes Dispatched</CardTitle>
            <Truck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchedRoutes} / {totalRoutes}</div>
            <p className="text-xs text-slate-500">{totalRoutes - dispatchedRoutes} routes pending</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => navigate("dispatcher")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{openExceptions}</div>
            <p className="text-xs text-slate-500">Open route exceptions</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Storage Summary</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate("storage")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <Database className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCapacityDisplay}</div>
              <p className="text-xs text-slate-500">Pallet positions</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate("storage")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used Capacity</CardTitle>
              <Layers className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usedCapacityDisplay}</div>
              <p className="text-xs text-slate-500">Currently stored</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate("storage")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy %</CardTitle>
              <Percent className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyDisplay}</div>
              <p className="text-xs text-slate-500">Across all zones</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate("storage")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Near-Capacity Racks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{nearCapacityDisplay}</div>
              <p className="text-xs text-slate-500">At or above 90% full</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rack Snapshot</CardTitle>
              <CardDescription>Top racks by occupancy for the selected tenant.</CardDescription>
            </div>
            <button
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              onClick={() => navigate("storage")}
            >
              View Full Storage -&gt;
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRacks.length === 0 ? (
              <div className="text-sm text-slate-500">No racks available.</div>
            ) : (
              topRacks.map(rack => {
                const status = getRackStatus(rack.occupancyPercent)
                return (
                  <div key={rack.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{rack.code}</div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{rack.occupancyPercent}% occupied</span>
                      <span>{rack.palletsStored.toLocaleString()} pallets stored</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-slate-900 dark:bg-slate-300"
                        style={{ width: `${Math.min(rack.occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Recommendations</CardTitle>
            <CardDescription>Priority actions and fragmentation alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommendations</div>
            {topSuggestions.length === 0 ? (
              <div className="text-sm text-slate-500">No recommendations available.</div>
            ) : (
              topSuggestions.map((suggestion) => {
                const severity = getSuggestionSeverity(suggestion)
                return (
                  <div key={suggestion.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge className={severity.className}>{severity.label}</Badge>
                        <span className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {suggestion.message}
                        </span>
                      </div>
                      {suggestion.actionLabel ? (
                        <span className="line-clamp-1 text-xs text-slate-500">
                          {suggestion.actionLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
            <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Fragmentation Alerts</div>
            {fragmentationAlerts.length === 0 ? (
              <div className="text-sm text-slate-500">No fragmentation alerts.</div>
            ) : (
              fragmentationAlerts.map((client) => (
                <div key={client.clientId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {client.clientName}
                      </span>
                      <Badge className="bg-rose-100 text-rose-700">Fragmented</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {client.racksUsed} racks • {client.zonesUsed} zones
                    </div>
                  </div>
                </div>
              ))
            )}
            <div>
              <button
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                onClick={() => navigate("storage")}
              >
                View all -&gt;
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Shipment Tracking</CardTitle>
              <CardDescription>Recent shipments and their current delivery status.</CardDescription>
            </div>
            <div>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="packed">Packed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate("orders")}
                  >
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "delivered" ? "default" : order.status === "pending" ? "secondary" : "outline"}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
