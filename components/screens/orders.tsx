"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Search, ChevronDown, ChevronRight, CheckCircle2, Loader2,
  MapPin, Package, Plus, Download, ShoppingCart, Clock, Truck,
  X, Hash, Layers, PackageCheck, Lock, Unlock, AlertTriangle, XCircle, Send,
} from "lucide-react"
import { Order, OrderLine, Client, Shipment } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

// ── Reservation summary type (mirrors API response) ──────────────────────────

interface ReservationLine {
  reservationId: string
  inventoryItemId: string
  sku: string
  orderLineId: string | null
  reservedQty: number
  pickedQty: number
  status: string
  balance: { on_hand: number; reserved: number; available: number } | null
}

interface ReservationSummary {
  orderId: string
  lines: ReservationLine[]
  totalReserved: number
  totalPicked: number
  fullyAllocated: boolean
  allPicked: boolean
}

const STATUS_STEPS = ["pending", "allocated", "picking", "packed", "shipped"] as const

const NEXT_STATUS: Record<string, Order["status"]> = {
  pending: "allocated",
  allocated: "picking",
  picking: "packed",
  packed: "shipped",
}

const ACTION_LABEL: Record<string, string> = {
  pending: "Allocate",
  allocated: "Release to Pick",
  picking: "Pack",
  packed: "Ship",
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  allocated: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  picking: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  packed: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  shipped: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
}

const ALL_STATUSES = ["all", "pending", "allocated", "picking", "packed", "shipped", "delivered"] as const
type StatusFilter = typeof ALL_STATUSES[number]

interface NewOrderLine {
  sku: string
  name: string
  qty: number
}

export function OrderManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()
  const [expandedOrder, setExpandedOrder] = React.useState<string | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [orderLinesData, setOrderLinesData] = React.useState<Record<string, OrderLine[]>>({})
  const [shipmentData, setShipmentData] = React.useState<Record<string, Shipment[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [clients, setClients] = React.useState<Client[]>([])

  // Reservation state
  const [reservations, setReservations] = React.useState<Record<string, ReservationSummary>>({})
  const [allocating, setAllocating] = React.useState<string | null>(null)
  const [releasing, setReleasing] = React.useState<string | null>(null)
  const [packing, setPacking] = React.useState<string | null>(null)
  const [shipping, setShipping] = React.useState<string | null>(null)
  const [cancelling, setCancelling] = React.useState<string | null>(null)
  const [allocationError, setAllocationError] = React.useState<Record<string, string>>({})
  const [allocationWarning, setAllocationWarning] = React.useState<Record<string, string>>({})
  // Allocate modal state
  const [showAllocateModal, setShowAllocateModal] = React.useState(false)
  const [allocateOrderId, setAllocateOrderId] = React.useState<string | null>(null)
  const [allocateLines, setAllocateLines] = React.useState<{ inventoryItemId: string; sku: string; qty: number }[]>([
    { inventoryItemId: "", sku: "", qty: 1 },
  ])

  // Create order modal
  const [showCreate, setShowCreate] = React.useState(false)
  const [newClientId, setNewClientId] = React.useState("")
  const [newDestination, setNewDestination] = React.useState("")
  const [newLines, setNewLines] = React.useState<NewOrderLine[]>([{ sku: "", name: "", qty: 1 }])
  const [creating, setCreating] = React.useState(false)

  // Mapbox address autocomplete
  const [geoSuggestions, setGeoSuggestions] = React.useState<string[]>([])
  const [showGeoSuggestions, setShowGeoSuggestions] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDestinationChange(value: string) {
    setNewDestination(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) {
      setGeoSuggestions([])
      setShowGeoSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&types=place,address&autocomplete=true&limit=5`
        )
        const data = await res.json()
        const places = (data.features ?? []).map((f: any) => f.place_name as string)
        setGeoSuggestions(places)
        setShowGeoSuggestions(places.length > 0)
      } catch {
        setGeoSuggestions([])
      }
    }, 300)
  }

  function selectGeoSuggestion(place: string) {
    setNewDestination(place)
    setGeoSuggestions([])
    setShowGeoSuggestions(false)
  }

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [data, clientList] = await Promise.all([
        api.orders.getOrdersByTenant(selectedTenant.id),
        api.clients.getClientsByTenant(selectedTenant.id),
      ])
      setOrders(data)
      setClients(clientList)
      setLoading(false)
    }
    loadData()
  }, [api, selectedTenant.id])

  // ── Reservation helpers ───────────────────────────────────────────────────

  async function loadReservation(orderId: string) {
    try {
      const res = await fetch(
        `/api/orders/${orderId}/reservation?tenantId=${encodeURIComponent(selectedTenant.id)}`
      )
      if (res.ok) {
        const data: ReservationSummary = await res.json()
        setReservations(prev => ({ ...prev, [orderId]: data }))
      }
    } catch {
      // non-fatal — UI just won't show reservation data
    }
  }

  function openAllocateModal(orderId: string) {
    setAllocateOrderId(orderId)
    setAllocateLines([{ inventoryItemId: "", sku: "", qty: 1 }])
    setAllocationError(prev => ({ ...prev, [orderId]: "" }))
    setAllocationWarning(prev => ({ ...prev, [orderId]: "" }))
    setShowAllocateModal(true)
  }

  async function handleAllocate() {
    if (!allocateOrderId) return
    const validLines = allocateLines.filter(l => l.inventoryItemId.trim() && l.sku.trim() && l.qty > 0)
    if (validLines.length === 0) {
      setAllocationError(prev => ({ ...prev, [allocateOrderId]: "Enter at least one valid line." }))
      return
    }
    setAllocating(allocateOrderId)
    setAllocationError(prev => ({ ...prev, [allocateOrderId!]: "" }))
    setAllocationWarning(prev => ({ ...prev, [allocateOrderId!]: "" }))
    try {
      const res = await fetch(`/api/orders/${allocateOrderId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant.id, lines: validLines }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAllocationError(prev => ({ ...prev, [allocateOrderId!]: data.error ?? "Allocation failed." }))
        return
      }
      if (data.partialAllocation) {
        const skus = (data.insufficient as { sku: string }[]).map(i => i.sku).join(", ")
        setAllocationWarning(prev => ({ ...prev, [allocateOrderId!]: `Partial allocation — insufficient stock for: ${skus}` }))
      }
      setOrders(prev => prev.map(o => o.id === allocateOrderId ? { ...o, status: "allocated" } : o))
      await loadReservation(allocateOrderId!)
      setShowAllocateModal(false)
    } finally {
      setAllocating(null)
    }
  }

  async function handleRelease(orderId: string) {
    setReleasing(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant.id }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "pending" } : o))
        setReservations(prev => {
          const next = { ...prev }
          delete next[orderId]
          return next
        })
      }
    } finally {
      setReleasing(null)
    }
  }

  // ── Pack confirmation ────────────────────────────────────────────────────

  async function handlePack(orderId: string) {
    setPacking(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant.id }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "packed" as const } : o))
      }
    } finally {
      setPacking(null)
    }
  }

  // ── Ship finalization ────────────────────────────────────────────────────

  async function handleShip(orderId: string) {
    setShipping(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant.id }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "shipped" as const } : o))
        const shipments = await api.shipments.getShipmentsByOrder(orderId)
        setShipmentData(prev => ({ ...prev, [orderId]: shipments }))
      }
    } finally {
      setShipping(null)
    }
  }

  // ── Cancel & release ─────────────────────────────────────────────────────

  async function handleCancel(orderId: string) {
    setCancelling(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant.id }),
      })
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        setReservations(prev => {
          const next = { ...prev }
          delete next[orderId]
          return next
        })
      }
    } finally {
      setCancelling(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const toggleExpand = async (id: string) => {
    if (expandedOrder === id) {
      setExpandedOrder(null)
    } else {
      setExpandedOrder(id)
      if (!orderLinesData[id]) {
        const lines = await api.orders.getOrderLines(id)
        setOrderLinesData(prev => ({ ...prev, [id]: lines }))
      }
      const order = orders.find(o => o.id === id)
      if (order && ["shipped", "delivered"].includes(order.status) && !shipmentData[id]) {
        const shipments = await api.shipments.getShipmentsByOrder(id)
        setShipmentData(prev => ({ ...prev, [id]: shipments }))
      }
      // Load reservation data for orders that may have active reservations
      if (order && ["allocated", "picking", "packed"].includes(order.status) && !reservations[id]) {
        await loadReservation(id)
      }
    }
  }

  async function advanceOrder(orderId: string, currentStatus: string) {
    // Route pack and ship through the trusted ledger-aware endpoints
    if (currentStatus === "picking" || currentStatus === "processing") {
      await handlePack(orderId)
      return
    }
    if (currentStatus === "packed") {
      await handleShip(orderId)
      return
    }
    const nextStatus = NEXT_STATUS[currentStatus]
    if (!nextStatus) return
    await api.orders.updateOrderStatus(orderId, nextStatus, selectedTenant.id)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
  }

  function openCreate() {
    setNewClientId(clients[0]?.id ?? "")
    setNewDestination("")
    setNewLines([{ sku: "", name: "", qty: 1 }])
    setShowCreate(true)
  }

  async function handleCreateOrder() {
    const clientObj = clients.find(c => c.id === newClientId)
    if (!clientObj || !newDestination.trim()) return
    setCreating(true)
    try {
      const totalItems = newLines.reduce((s, l) => s + (l.qty || 0), 0)
      const order = await api.orders.createOrder({
        tenantId: selectedTenant.id,
        client: clientObj.name,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        items: totalItems,
        status: "pending",
        destination: newDestination.trim(),
      })
      setOrders(prev => [order, ...prev])
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!o.id.toLowerCase().includes(q) && !o.client.toLowerCase().includes(q)) return false
    }
    return true
  })

  const kpis: { label: string; value: number; status: StatusFilter; icon: React.ElementType; color: string; bg: string }[] = [
    {
      label: "Total", value: orders.length, status: "all",
      icon: ShoppingCart, color: "text-slate-700 dark:text-slate-300",
      bg: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
    },
    {
      label: "Pending", value: orders.filter(o => o.status === "pending").length, status: "pending",
      icon: Clock, color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30",
    },
    {
      label: "Allocated", value: orders.filter(o => o.status === "allocated").length, status: "allocated",
      icon: Package, color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30",
    },
    {
      label: "Picking", value: orders.filter(o => o.status === "picking").length, status: "picking",
      icon: Layers, color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30",
    },
    {
      label: "Packed", value: orders.filter(o => o.status === "packed").length, status: "packed",
      icon: PackageCheck, color: "text-purple-700 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30",
    },
    {
      label: "Shipped", value: orders.filter(o => ["shipped", "delivered"].includes(o.status)).length, status: "shipped",
      icon: Truck, color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30",
    },
  ]

  const renderStepper = (status: string) => {
    const currentIndex = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number])
    return (
      <div className="flex items-center w-full">
        {STATUS_STEPS.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center border-2 text-xs font-medium
                ${index < currentIndex
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : index === currentIndex
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500"}`}
              >
                {index < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : <span>{index + 1}</span>}
              </div>
              <span className={`text-[10px] mt-1 capitalize font-medium whitespace-nowrap
                ${index < currentIndex
                  ? "text-emerald-600 dark:text-emerald-400"
                  : index === currentIndex
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-slate-400 dark:text-slate-500"}`}>
                {step}
              </span>
            </div>
            {index < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-3 ${index < currentIndex ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-600"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Order Management</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />Create Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          const isActive = statusFilter === kpi.status
          return (
            <Card
              key={kpi.label}
              onClick={() => setStatusFilter(kpi.status)}
              className={`${kpi.bg} shadow-none cursor-pointer transition-all hover:shadow-sm ${isActive ? "ring-2 ring-slate-400 dark:ring-slate-500 ring-offset-1 dark:ring-offset-slate-900" : ""}`}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
                <Icon className={`h-5 w-5 ${kpi.color} opacity-40`} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>All Orders</CardTitle>
              <CardDescription className="dark:text-slate-400">Manage fulfillment from allocation to shipping.</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search order or client..."
                className="h-9 w-56 rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-700 pb-0 overflow-x-auto">
            {ALL_STATUSES.map(s => {
              const count = s === "all" ? orders.length : orders.filter(o => o.status === s).length
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors capitalize ${
                    statusFilter === s
                      ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    statusFilter === s
                      ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/30">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    No orders match your filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredOrders.map(order => (
                <React.Fragment key={order.id}>
                  <TableRow
                    className={`cursor-pointer ${expandedOrder === order.id ? "bg-slate-50 dark:bg-slate-800/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}`}
                    onClick={() => toggleExpand(order.id)}
                  >
                    <TableCell>
                      {expandedOrder === order.id
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium dark:text-slate-200">{order.id}</TableCell>
                    <TableCell className="font-medium dark:text-slate-200">{order.client}</TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400">{order.date}</TableCell>
                    <TableCell className="text-sm dark:text-slate-300">{order.items} items</TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400 max-w-[140px] truncate">{order.destination}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] || "bg-slate-100 text-slate-700"}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      {NEXT_STATUS[order.status] ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            packing === order.id || shipping === order.id || cancelling === order.id
                          }
                          onClick={() => advanceOrder(order.id, order.status)}
                          className="gap-1.5"
                        >
                          {(packing === order.id || shipping === order.id) && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {order.status === "packed" && <Send className="h-3 w-3" />}
                          {ACTION_LABEL[order.status]}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled className="text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {expandedOrder === order.id && (
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell colSpan={8} className="p-0">
                        <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-700 space-y-6">
                          {/* Stepper */}
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Fulfillment Progress</p>
                            {renderStepper(order.status)}
                          </div>

                          {/* Meta grid */}
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Shipping To</p>
                              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                <span>{order.destination}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Order Info</p>
                              <div className="space-y-1 text-sm">
                                <p className="text-slate-500 dark:text-slate-400">Client: <span className="text-slate-900 dark:text-slate-100 font-medium">{order.client}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Date: <span className="text-slate-900 dark:text-slate-100">{order.date}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Items: <span className="text-slate-900 dark:text-slate-100">{order.items}</span></p>
                              </div>
                            </div>
                          </div>

                          {/* Shipment details */}
                          {["shipped", "delivered"].includes(order.status) && shipmentData[order.id] && shipmentData[order.id].length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Shipment Details</p>
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
                                {shipmentData[order.id].map(s => (
                                  <div key={s.id} className="flex flex-wrap items-center gap-5 text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="text-slate-500 dark:text-slate-400">Carrier:</span>
                                      <span className="font-medium dark:text-slate-200">{s.carrier}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="text-slate-500 dark:text-slate-400">Tracking:</span>
                                      <span className="font-mono font-medium dark:text-slate-200">{s.trackingNumber}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      s.status === "delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                        : s.status === "in_transit" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                    }`}>
                                      {s.status.replace("_", " ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inventory Allocation Panel */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Inventory Allocation
                              </p>
                              {order.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={e => { e.stopPropagation(); openAllocateModal(order.id) }}
                                  className="h-7 text-xs gap-1.5"
                                >
                                  <Lock className="h-3 w-3" />
                                  Allocate Inventory
                                </Button>
                              )}
                              {["allocated", "picking"].includes(order.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={e => { e.stopPropagation(); handleRelease(order.id) }}
                                  disabled={releasing === order.id}
                                  className="h-7 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
                                >
                                  {releasing === order.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Unlock className="h-3 w-3" />}
                                  Release
                                </Button>
                              )}
                              {["pending", "allocated", "picking", "processing", "packed"].includes(order.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={e => { e.stopPropagation(); handleCancel(order.id) }}
                                  disabled={cancelling === order.id}
                                  className="h-7 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                >
                                  {cancelling === order.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <XCircle className="h-3 w-3" />}
                                  Cancel & Release
                                </Button>
                              )}
                            </div>

                            {allocationError[order.id] && (
                              <div className="mb-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                {allocationError[order.id]}
                              </div>
                            )}
                            {allocationWarning[order.id] && (
                              <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                {allocationWarning[order.id]}
                              </div>
                            )}

                            {reservations[order.id] && reservations[order.id].lines.length > 0 ? (
                              <div className="rounded-lg border border-blue-100 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10 overflow-hidden">
                                <Table>
                                  <TableHeader className="bg-blue-50 dark:bg-blue-900/20">
                                    <TableRow>
                                      <TableHead className="h-7 text-xs">SKU</TableHead>
                                      <TableHead className="h-7 text-xs text-right">Reserved</TableHead>
                                      <TableHead className="h-7 text-xs text-right">Picked</TableHead>
                                      <TableHead className="h-7 text-xs text-right">Available</TableHead>
                                      <TableHead className="h-7 text-xs">State</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {reservations[order.id].lines.map(line => (
                                      <TableRow key={line.reservationId}>
                                        <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 py-1.5">{line.sku}</TableCell>
                                        <TableCell className="text-xs text-right py-1.5 dark:text-slate-300">{line.reservedQty}</TableCell>
                                        <TableCell className="text-xs text-right py-1.5 dark:text-slate-300">{line.pickedQty}</TableCell>
                                        <TableCell className="text-xs text-right py-1.5">
                                          <span className={line.balance && line.balance.available > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                                            {line.balance?.available ?? "—"}
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                            line.status === "fulfilled" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            : line.status === "partially_picked" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                            : line.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                                          }`}>
                                            {line.status.replace("_", " ")}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                <div className="px-4 py-2 border-t border-blue-100 dark:border-blue-800/30 text-xs text-slate-500 dark:text-slate-400 flex gap-4">
                                  <span>Reserved: <strong className="text-slate-700 dark:text-slate-200">{reservations[order.id].totalReserved}</strong></span>
                                  <span>Picked: <strong className="text-slate-700 dark:text-slate-200">{reservations[order.id].totalPicked}</strong></span>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                                {order.status === "pending"
                                  ? "No inventory allocated yet. Click \"Allocate Inventory\" to reserve stock for this order."
                                  : "No reservation records found."}
                              </div>
                            )}
                          </div>

                          {/* Order Lines */}
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Order Lines</p>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                                  <TableRow>
                                    <TableHead className="h-8 text-xs">SKU</TableHead>
                                    <TableHead className="h-8 text-xs">Product</TableHead>
                                    <TableHead className="h-8 text-xs text-right">Ordered</TableHead>
                                    <TableHead className="h-8 text-xs text-right">Allocated</TableHead>
                                    <TableHead className="h-8 text-xs text-right">Fill Rate</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {orderLinesData[order.id] && orderLinesData[order.id].length > 0
                                    ? orderLinesData[order.id].map((line, idx) => {
                                        const fill = line.qty > 0 ? Math.round((line.allocatedQty / line.qty) * 100) : 0
                                        return (
                                          <TableRow key={idx}>
                                            <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">{line.sku}</TableCell>
                                            <TableCell className="text-xs font-medium dark:text-slate-200">{line.name}</TableCell>
                                            <TableCell className="text-xs text-right dark:text-slate-300">{line.qty}</TableCell>
                                            <TableCell className="text-xs text-right dark:text-slate-300">{line.allocatedQty}</TableCell>
                                            <TableCell className="text-xs text-right">
                                              <span className={`font-semibold ${fill === 100 ? "text-emerald-600 dark:text-emerald-400" : fill > 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                                                {fill}%
                                              </span>
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })
                                    : (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-4">
                                          No line details available.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocate Inventory Modal */}
      <Dialog open={showAllocateModal} onOpenChange={setShowAllocateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-500" />
                Allocate Inventory
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 mb-1">
            Enter the inventory items and quantities to reserve for order{" "}
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{allocateOrderId}</span>.
          </p>
          {allocateOrderId && allocationError[allocateOrderId] && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {allocationError[allocateOrderId]}
            </div>
          )}
          <div className="space-y-2 mt-1">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Inventory Item ID</span><span>SKU</span><span>Qty</span><span></span>
            </div>
            {allocateLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                <input
                  type="text"
                  value={line.inventoryItemId}
                  onChange={e => setAllocateLines(prev => prev.map((l, i) => i === idx ? { ...l, inventoryItemId: e.target.value } : l))}
                  placeholder="INV-001"
                  className="h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-slate-100 px-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  type="text"
                  value={line.sku}
                  onChange={e => setAllocateLines(prev => prev.map((l, i) => i === idx ? { ...l, sku: e.target.value } : l))}
                  placeholder="SKU-100"
                  className="h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-slate-100 px-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  type="number"
                  value={line.qty}
                  min={1}
                  onChange={e => setAllocateLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: parseInt(e.target.value) || 1 } : l))}
                  className="w-16 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-slate-100 px-2 focus:outline-none focus:ring-1 focus:ring-slate-400 text-center"
                />
                {allocateLines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setAllocateLines(prev => prev.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : <span />}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAllocateLines(prev => [...prev, { inventoryItemId: "", sku: "", qty: 1 }])}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 mt-1"
            >
              <Plus className="h-3 w-3" /> Add line
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocateModal(false)}>Cancel</Button>
            <Button
              onClick={handleAllocate}
              disabled={allocating !== null}
              className="gap-1.5"
            >
              {allocating !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Reserve Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Client</label>
              <select
                value={newClientId}
                onChange={e => setNewClientId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-100 px-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {clients.length === 0 && <option value="">No clients available</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Destination</label>
              <div className="relative">
                <input
                  type="text"
                  value={newDestination}
                  onChange={e => handleDestinationChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowGeoSuggestions(false), 150)}
                  onFocus={() => geoSuggestions.length > 0 && setShowGeoSuggestions(true)}
                  placeholder="Start typing a city or address…"
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-100 px-3 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {showGeoSuggestions && geoSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg overflow-hidden">
                    {geoSuggestions.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => selectGeoSuggestion(place)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{place}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Lines</label>
                <button
                  type="button"
                  onClick={() => setNewLines(prev => [...prev, { sku: "", name: "", qty: 1 }])}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add line
                </button>
              </div>
              <div className="space-y-2">
                {newLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={line.sku}
                      onChange={e => setNewLines(prev => prev.map((l, i) => i === idx ? { ...l, sku: e.target.value } : l))}
                      placeholder="SKU"
                      className="w-24 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-slate-100 px-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <input
                      type="text"
                      value={line.name}
                      onChange={e => setNewLines(prev => prev.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))}
                      placeholder="Product name"
                      className="flex-1 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-slate-100 px-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <input
                      type="number"
                      value={line.qty}
                      min={1}
                      onChange={e => setNewLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: parseInt(e.target.value) || 1 } : l))}
                      className="w-14 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs dark:text-slate-100 px-2 focus:outline-none focus:ring-1 focus:ring-slate-400 text-center"
                    />
                    {newLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewLines(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateOrder} disabled={creating || !newClientId || !newDestination.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
