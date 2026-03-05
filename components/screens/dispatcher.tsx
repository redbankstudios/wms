"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Map, Users, AlertTriangle, Search, Clock, Phone,
  Calendar as CalendarIcon, Truck, RefreshCw, Loader2,
  MessageSquare, WifiOff, Send, ChevronDown, ChevronUp, CheckCheck,
} from "lucide-react"
import { DriverMessage, Route, RouteStop, Vehicle } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import { RouteException } from "@/data/providers/IDataProvider"

// Lazy-load the Mapbox component (browser-only)
const DispatcherMap = dynamic(() => import("./dispatcher-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
      <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
    </div>
  ),
})

// ─── Route color palette (matches dispatcher-map.tsx) ────────────────────────

const ROUTE_COLORS: Record<string, string> = {
  "RT-842": "#3b82f6",
  "RT-843": "#8b5cf6",
  "RT-840": "#f97316",
  "RT-839": "#10b981",
}
const FALLBACK_COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#06b6d4"]
function routeColor(routeId: string, idx: number) {
  return ROUTE_COLORS[routeId] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

type MsgFilter = "all" | "unanswered" | "read" | "replied"

const statusStyle: Record<DriverMessage["status"], { border: string; badge: string; label: string }> = {
  unanswered: { border: "border-l-amber-400",   badge: "bg-amber-100  text-amber-800  border-amber-200",   label: "Unanswered" },
  read:        { border: "border-l-blue-400",    badge: "bg-blue-100   text-blue-800   border-blue-200",    label: "Read"       },
  replied:     { border: "border-l-emerald-400", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Replied"  },
}

// ─── MessageCard ─────────────────────────────────────────────────────────────

interface MessageCardProps {
  message: DriverMessage
  replies: DriverMessage[]
  isDriverActive: boolean
  onReply: (parentId: string, driverId: string, driverName: string, routeId: string | undefined, body: string) => Promise<void>
  onMarkRead: (messageId: string) => Promise<void>
  onDriverNameClick: (driverId: string) => void
}

function MessageCard({ message, replies, isDriverActive, onReply, onMarkRead, onDriverNameClick }: MessageCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [replyOpen, setReplyOpen] = React.useState(false)
  const [replyText, setReplyText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [marking, setMarking] = React.useState(false)
  const s = statusStyle[message.status]

  const handleSend = async () => {
    if (!replyText.trim()) return
    setSending(true)
    await onReply(message.id, message.driverId, message.driverName, message.routeId, replyText.trim())
    setReplyText("")
    setReplyOpen(false)
    setSending(false)
  }

  const handleMarkRead = async () => {
    setMarking(true)
    await onMarkRead(message.id)
    setMarking(false)
  }

  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-l-4 ${s.border} shadow-sm`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
              onClick={() => onDriverNameClick(message.driverId)}
            >
              {message.driverName}
            </button>
            {message.routeId && (
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{message.routeId}</span>
            )}
            {!isDriverActive ? (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                En Route
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${s.badge}`}>{s.label}</Badge>
            <span className="text-xs text-slate-400">{formatTime(message.createdAt)}</span>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{message.body}</p>

        {replies.length > 0 && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} reply
          </button>
        )}
      </div>

      {expanded && replies.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
          {replies.map(r => (
            <div key={r.id} className="ml-auto max-w-[85%] flex flex-col items-end">
              <div className="bg-indigo-600 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm">{r.body}</div>
              <span className="text-[10px] text-slate-400 mt-0.5">Dispatcher · {formatTime(r.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {replyOpen && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {!isDriverActive && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Driver is currently offline — reply will be delivered when they reconnect.
            </p>
          )}
          <textarea
            className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
            rows={3}
            placeholder="Type your reply…"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setReplyOpen(false); setReplyText("") }}>Cancel</Button>
            <Button size="sm" onClick={handleSend} disabled={!replyText.trim() || sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send
            </Button>
          </div>
        </div>
      )}

      {!replyOpen && (
        <div className="flex items-center gap-2 px-4 pb-3 border-t border-slate-100 pt-2">
          <Button variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => { setReplyOpen(true); setExpanded(false) }}>
            <MessageSquare className="h-3 w-3 mr-1" /> Reply
          </Button>
          {message.status === "unanswered" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-800"
              onClick={handleMarkRead} disabled={marking}>
              {marking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3 mr-1" />}
              Mark Read
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DispatcherConsole() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [driverList, setDriverList] = React.useState<Route[]>([])
  const [idleVehicles, setIdleVehicles] = React.useState<Vehicle[]>([])
  const [exceptions, setExceptions] = React.useState<RouteException[]>([])
  const [messages, setMessages] = React.useState<DriverMessage[]>([])
  const [allRouteStops, setAllRouteStops] = React.useState<Record<string, RouteStop[]>>({})
  const [msgFilter, setMsgFilter] = React.useState<MsgFilter>("all")
  const [activeTab, setActiveTab] = React.useState("live-map")
  const [selectedDriverId, setSelectedDriverId] = React.useState<string | null>(null)
  const [assignModal, setAssignModal] = React.useState<{ isOpen: boolean; driverId: string | null }>({ isOpen: false, driverId: null })
  const [selectedVehicleId, setSelectedVehicleId] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [sidebarSearch, setSidebarSearch] = React.useState("")

  // Resolve tenantId
  React.useEffect(() => {
    async function resolve() {
      if (selectedTenant?.id) { setTenantId(selectedTenant.id); return }
      const tenants = await api.tenants.getTenants()
      setTenantId(tenants[0]?.id ?? null)
    }
    resolve()
  }, [api, selectedTenant?.id])

  const loadData = React.useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const [routes, vehicles, exceptionList, msgs] = await Promise.all([
      api.routes.getAllRoutes(),
      api.vehicles.getAllVehicles(),
      api.routes.getExceptions(tenantId),
      api.messages.getMessagesByTenant(tenantId),
    ])

    setDriverList(routes)
    setExceptions(exceptionList)
    setMessages(msgs)

    const assignedVehicleIds = new Set(routes.filter(r => r.vehicleId !== "Unassigned").map(r => r.vehicleId))
    setIdleVehicles(vehicles.filter(v => v.status === "good" && !assignedVehicleIds.has(v.id)))

    // Load route stops for all non-available routes
    const stopsByRoute: Record<string, RouteStop[]> = {}
    await Promise.all(
      routes
        .filter(r => r.status !== "available")
        .map(async r => { stopsByRoute[r.id] = await api.routes.getRouteStops(r.id) })
    )
    setAllRouteStops(stopsByRoute)

    setLoading(false)
  }, [api, tenantId])

  React.useEffect(() => { loadData() }, [loadData])

  // Navigate to live map and focus a driver
  const selectDriver = React.useCallback((driverId: string) => {
    setSelectedDriverId(driverId)
    setActiveTab("live-map")
  }, [])

  const handleAssignVehicle = () => {
    if (!assignModal.driverId || !selectedVehicleId) return
    setDriverList(prev => prev.map(d => d.id === assignModal.driverId ? { ...d, vehicleId: selectedVehicleId } : d))
    setIdleVehicles(prev => prev.filter(v => v.id !== selectedVehicleId))
    setAssignModal({ isOpen: false, driverId: null })
    setSelectedVehicleId("")
  }

  const handleReply = async (parentId: string, driverId: string, driverName: string, routeId: string | undefined, body: string) => {
    if (!tenantId) return
    const reply = await api.messages.replyToMessage(parentId, tenantId, driverId, driverName, routeId, body)
    setMessages(prev => [reply, ...prev.map(m => m.id === parentId ? { ...m, status: "replied" as const } : m)])
  }

  const handleMarkRead = async (messageId: string) => {
    await api.messages.markAsRead(messageId)
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: "read" as const, readAt: new Date().toISOString() } : m))
  }

  // Derived message data
  const activeDriverIds = new Set(
    driverList.filter(r => r.status === "on_route" || r.status === "break").map(r => r.driverId)
  )
  const topLevelMessages = messages.filter(m => m.senderRole === "driver" && !m.parentId)
  const replyMap = React.useMemo(() => {
    const map: Record<string, DriverMessage[]> = {}
    messages.filter(m => m.parentId).forEach(m => {
      const key = m.parentId!
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return map
  }, [messages])
  const filteredMessages = topLevelMessages.filter(m => msgFilter === "all" ? true : m.status === msgFilter)
  const unansweredCount = topLevelMessages.filter(m => m.status === "unanswered").length

  // Sidebar filtered drivers
  const activeDrivers = driverList.filter(d => d.status !== "completed" && d.status !== "available")
  const filteredSidebarDrivers = sidebarSearch.trim()
    ? activeDrivers.filter(d =>
        d.driverName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        d.id.toLowerCase().includes(sidebarSearch.toLowerCase())
      )
    : activeDrivers

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dispatcher Console</h2>
        <Button variant="outline" onClick={loadData}><RefreshCw className="mr-2 h-4 w-4" /> Refresh Data</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="live-map"><Map className="h-4 w-4 mr-2" /> Live Map</TabsTrigger>
          <TabsTrigger value="roster"><Users className="h-4 w-4 mr-2" /> Driver Roster</TabsTrigger>
          <TabsTrigger value="exceptions">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Exceptions
            <Badge className="ml-2 bg-red-500 hover:bg-red-600 px-1.5 py-0.5 text-[10px]">{exceptions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
            {unansweredCount > 0 && (
              <Badge className="ml-2 bg-amber-500 hover:bg-amber-600 px-1.5 py-0.5 text-[10px]">{unansweredCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Live Map ── */}
        <TabsContent value="live-map" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
            {/* Sidebar */}
            <Card className="col-span-1 flex flex-col h-full overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 shrink-0">
                <CardTitle className="text-lg">Active Routes</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="search"
                    placeholder="Search driver or route..."
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredSidebarDrivers.map((driver, idx) => {
                  const isSelected = selectedDriverId === driver.driverId
                  const color = routeColor(driver.id, idx)
                  return (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriverId(isSelected ? null : driver.driverId)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-400 bg-blue-50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{driver.driverName}</div>
                        </div>
                        <Badge
                          variant={driver.status === "on_route" ? "default" : "secondary"}
                          className={`text-[10px] px-1.5 ${driver.status === "on_route" ? "bg-blue-500" : ""}`}
                        >
                          {driver.status === "on_route" ? "En Route" : "On Break"}
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 mb-1.5">
                        <Truck className="h-3 w-3 mr-1" /> {driver.vehicleId} · {driver.id}
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-600">{driver.progress} stops</span>
                        <span className="text-emerald-600">On Time</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {selectedDriverId && (
                <div className="p-3 border-t border-slate-100 shrink-0">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 h-7"
                    onClick={() => setSelectedDriverId(null)}>
                    Clear selection — show all routes
                  </Button>
                </div>
              )}
            </Card>

            {/* Map */}
            <Card className="col-span-1 lg:col-span-2 overflow-hidden p-0">
              <div className="h-full w-full rounded-lg overflow-hidden">
                <DispatcherMap
                  routes={driverList}
                  routeStops={allRouteStops}
                  selectedDriverId={selectedDriverId}
                  onDriverSelect={driverId => setSelectedDriverId(driverId)}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Driver Roster ── */}
        <TabsContent value="roster">
          <Card>
            <CardHeader>
              <CardTitle>Driver Roster & Schedule</CardTitle>
              <CardDescription>Manage driver availability, shifts, and current assignments. Click a driver name to view their route on the map.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Active Route</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverList.map((driver, idx) => {
                    const color = routeColor(driver.id, idx)
                    return (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <button
                            className="font-medium text-left hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            onClick={() => selectDriver(driver.driverId)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                              {driver.driverName}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5 ml-4">{driver.driverId}</div>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            driver.status === "on_route" ? "default" :
                            driver.status === "completed" ? "outline" : "secondary"
                          } className={
                            driver.status === "on_route" ? "bg-blue-500 hover:bg-blue-600" :
                            driver.status === "completed" ? "text-emerald-600 border-emerald-200" : ""
                          }>
                            {driver.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-slate-600">
                            <Clock className="h-3 w-3 mr-1.5 text-slate-400" />{driver.shift}
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.vehicleId === "Unassigned" ? (
                            <Button variant="outline" size="sm" className="h-7 text-xs border-dashed"
                              onClick={() => setAssignModal({ isOpen: true, driverId: driver.id })}>
                              Assign Vehicle
                            </Button>
                          ) : driver.vehicleId}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{driver.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{driver.progress}</span>
                            <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${driver.status === "completed" ? "bg-emerald-500" : "bg-blue-500"}`}
                                style={{ width: `${(parseInt(driver.progress.split("/")[0]) / parseInt(driver.progress.split("/")[1])) * 100}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm"><Phone className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm"><CalendarIcon className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Exceptions ── */}
        <TabsContent value="exceptions">
          <Card className="border-red-100 shadow-sm">
            <CardHeader className="bg-red-50/50 border-b border-red-100">
              <CardTitle className="text-red-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Delivery Exceptions
              </CardTitle>
              <CardDescription className="text-red-700/80">Issues requiring dispatcher intervention.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Route / Driver</TableHead>
                    <TableHead>Stop / Customer</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map(exc => {
                    const isResolved = exc.status === "resolved"
                    return (
                      <TableRow key={exc.id} className={isResolved ? "bg-slate-50 opacity-60" : "bg-white"}>
                        <TableCell className="pl-6 font-medium text-slate-900">{exc.createdAt}</TableCell>
                        <TableCell>
                          <div className="font-medium">{exc.routeId ?? "-"}</div>
                          <div className="text-xs text-slate-500">{exc.detail ?? "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{exc.title}</div>
                          <div className="text-xs text-slate-500">{exc.detail ?? "-"}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${isResolved ? "text-slate-600" : "text-red-600"}`}>{exc.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isResolved ? "outline" : "destructive"}>{(exc.status ?? "open").toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {isResolved ? (
                            <span className="text-xs font-medium text-slate-500">Resolved</span>
                          ) : (
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="outline">Reschedule</Button>
                              <Button size="sm">Resolve</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Messages ── */}
        <TabsContent value="messages">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{topLevelMessages.length}</span> total messages
                {unansweredCount > 0 && (
                  <span className="text-amber-700 font-medium">· {unansweredCount} need attention</span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                {(["all", "unanswered", "read", "replied"] as MsgFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setMsgFilter(f)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                      msgFilter === f ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && (
                      <span className="ml-1.5 text-xs text-slate-400">
                        ({topLevelMessages.filter(m => m.status === f).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No messages</p>
                <p className="text-slate-400 text-sm mt-1">
                  {msgFilter === "all" ? "No driver messages yet." : `No ${msgFilter} messages.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map(msg => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    replies={replyMap[msg.id] ?? []}
                    isDriverActive={activeDriverIds.has(msg.driverId)}
                    onReply={handleReply}
                    onMarkRead={handleMarkRead}
                    onDriverNameClick={selectDriver}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Assign Vehicle Modal ── */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[400px] shadow-lg">
            <CardHeader>
              <CardTitle>Assign Vehicle</CardTitle>
              <CardDescription>
                Select an idle vehicle to assign to {driverList.find(d => d.id === assignModal.driverId)?.driverName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Available Vehicles</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                  value={selectedVehicleId}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                >
                  <option value="" disabled>Select a vehicle...</option>
                  {idleVehicles.length === 0 && <option value="" disabled>No idle vehicles available</option>}
                  {idleVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.id} - {v.type}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => { setAssignModal({ isOpen: false, driverId: null }); setSelectedVehicleId("") }}>Cancel</Button>
                <Button onClick={handleAssignVehicle} disabled={!selectedVehicleId}>Assign</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
