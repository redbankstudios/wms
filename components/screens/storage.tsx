"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Layers, Package, AlertTriangle, ArrowRight, Loader2, Box, Info, ExternalLink,
  TrendingUp, CheckCircle2, Zap, Shield, X
} from "lucide-react"
import {
  WarehouseZone, Rack, StorageLocation, TenantStorageSummary,
  PutawaySuggestion, Client, InventoryItem, Task
} from "@/types"
import { useDemo } from "@/context/DemoContext"
import { getProvider } from "@/data"

function navigateTo(tab: string) {
  window.history.pushState(null, "", `/?tab=${tab}`)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

type ActiveModal = "task" | "overflow" | "assign-rack" | null

export function StorageManagement() {
  const { selectedTenant } = useDemo()
  const api = React.useMemo(() => getProvider(), [])

  // ── Core data ──────────────────────────────────────────────────
  const [metrics, setMetrics] = React.useState<any>(null)
  const [zones, setZones] = React.useState<WarehouseZone[]>([])
  const [racks, setRacks] = React.useState<Rack[]>([])
  const [locations, setLocations] = React.useState<StorageLocation[]>([])
  const [summaries, setSummaries] = React.useState<TenantStorageSummary[]>([])
  const [suggestions, setSuggestions] = React.useState<PutawaySuggestion[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([])

  const [selectedZone, setSelectedZone] = React.useState<string | null>(null)
  const [selectedRack, setSelectedRack] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("overview")

  // ── Modal state ─────────────────────────────────────────────────
  const [activeModal, setActiveModal] = React.useState<ActiveModal>(null)
  const [modalSuggestion, setModalSuggestion] = React.useState<PutawaySuggestion | null>(null)
  const [modalSubmitting, setModalSubmitting] = React.useState(false)
  const [modalSuccess, setModalSuccess] = React.useState(false)

  // Task creation form
  const [taskForm, setTaskForm] = React.useState<{
    type: Task["type"]
    priority: Task["priority"]
    assignee: string
    location: string
    items: number
  }>({ type: "Putaway", priority: "urgent", assignee: "", location: "", items: 1 })

  // Assign rack form
  const [assignRackClientId, setAssignRackClientId] = React.useState("")

  const tenantId = selectedTenant.id

  // ── Derived lookups ─────────────────────────────────────────────
  const clientNameMap = React.useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients]
  )

  const inventoryByLocation = React.useMemo(() => {
    const map: Record<string, InventoryItem[]> = {}
    for (const item of inventoryItems) {
      if (!item.location) continue
      if (!map[item.location]) map[item.location] = []
      map[item.location].push(item)
    }
    return map
  }, [inventoryItems])

  const tenantGroupingStats = React.useMemo(() => {
    if (!summaries.length) return null
    const avgRacks = summaries.reduce((acc, s) => acc + s.racksUsed, 0) / summaries.length
    const grouped = summaries.filter(s => s.fragmentationScore === 'low').length
    const consolidationOpps = summaries.filter(s => s.fragmentationScore === 'high' && s.racksUsed > 2).length
    return { avgRacks, grouped, consolidationOpps }
  }, [summaries])

  const suggestionsByPriority = React.useMemo(() => ({
    high: suggestions.filter(s => s.priority === 'high'),
    medium: suggestions.filter(s => s.priority === 'medium'),
    low: suggestions.filter(s => s.priority === 'low'),
  }), [suggestions])

  const zonesAtRisk = React.useMemo(() =>
    zones
      .filter(z => (z.usedCapacity / z.totalCapacity) >= 0.85)
      .sort((a, b) => (b.usedCapacity / b.totalCapacity) - (a.usedCapacity / a.totalCapacity)),
    [zones]
  )

  const fragmentedClients = summaries.filter(s => s.fragmentationScore === 'high')
  const spreadClients = summaries.filter(s => s.fragmentationScore === 'medium')

  // ── Data loading ────────────────────────────────────────────────
  React.useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      const [m, z, s, p, cl, inv] = await Promise.all([
        api.storage.getOverallStorageMetrics(tenantId),
        api.storage.getWarehouseZones(tenantId),
        api.storage.getStorageSummaryByClient(tenantId),
        api.storage.getPutawaySuggestions(tenantId),
        api.clients.getClientsByTenant(tenantId),
        api.inventory.getInventoryByTenant(tenantId),
      ])
      setMetrics(m)
      setZones(z)
      setSummaries(s)
      setSuggestions(p)
      setClients(cl)
      setInventoryItems(inv)
      if (z.length > 0) setSelectedZone(z[0].id)
      setLoading(false)
    }
    loadInitialData()
  }, [api, tenantId])

  React.useEffect(() => {
    async function loadRacks() {
      if (selectedZone) {
        const r = await api.storage.getRacksByZone(tenantId, selectedZone)
        setRacks(r)
        setSelectedRack(null)
        setLocations([])
      }
    }
    loadRacks()
  }, [api, selectedZone, tenantId])

  React.useEffect(() => {
    async function loadLocations() {
      if (selectedRack) {
        const l = await api.storage.getStorageLocationsByRack(tenantId, selectedRack)
        setLocations(l)
      }
    }
    loadLocations()
  }, [api, selectedRack, tenantId])

  // ── Suggestion action handler ────────────────────────────────────
  function handleSuggestionAction(suggestion: PutawaySuggestion) {
    setModalSuccess(false)

    if (suggestion.type === "consolidation") {
      setActiveTab("fragmentation")
      return
    }

    if (suggestion.type === "grouping" && suggestion.actionLabel === "Process Returns") {
      navigateTo("returns")
      return
    }

    if (suggestion.type === "replenishment") {
      const zone = zones.find(z => z.id === suggestion.associatedZoneId)
      const priorityMap: Record<PutawaySuggestion["priority"], Task["priority"]> = {
        high: "urgent", medium: "high", low: "normal"
      }
      setTaskForm({
        type: "Putaway",
        priority: priorityMap[suggestion.priority],
        assignee: "",
        location: zone ? zone.name : (suggestion.associatedZoneId ?? ""),
        items: 1,
      })
      setModalSuggestion(suggestion)
      setActiveModal("task")
      return
    }

    if (suggestion.type === "overflow") {
      setModalSuggestion(suggestion)
      setActiveModal("overflow")
      return
    }

    if (suggestion.type === "grouping" && suggestion.actionLabel === "Assign Rack") {
      setAssignRackClientId(suggestion.associatedClientId ?? "")
      setModalSuggestion(suggestion)
      setActiveModal("assign-rack")
      return
    }
  }

  function closeModal() {
    setActiveModal(null)
    setModalSuggestion(null)
    setModalSuccess(false)
    setModalSubmitting(false)
  }

  async function submitTask() {
    setModalSubmitting(true)
    try {
      await api.tasks.createTask({
        tenantId,
        type: taskForm.type,
        status: "pending",
        priority: taskForm.priority,
        assignee: taskForm.assignee || "Unassigned",
        location: taskForm.location,
        items: taskForm.items,
      })
      setModalSuccess(true)
    } finally {
      setModalSubmitting(false)
    }
  }

  async function submitAssignRack() {
    if (!modalSuggestion?.associatedRackId || !assignRackClientId) return
    setModalSubmitting(true)
    try {
      await api.storage.updateRack(modalSuggestion.associatedRackId, { preferredClientId: assignRackClientId })
      // Refresh racks if the rack belongs to the currently selected zone
      if (selectedZone) {
        const r = await api.storage.getRacksByZone(tenantId, selectedZone)
        setRacks(r)
      }
      setModalSuccess(true)
    } finally {
      setModalSubmitting(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (loading || !metrics) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  // ── Helpers ─────────────────────────────────────────────────────
  const getZoneColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-500", emerald: "bg-emerald-500",
      amber: "bg-amber-500", red: "bg-red-500", slate: "bg-slate-500"
    }
    return colors[color] || "bg-slate-500"
  }

  const getRackStatusColor = (used: number, total: number) => {
    const pct = (used / total) * 100
    if (pct >= 95) return "bg-red-500"
    if (pct >= 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const overflowZone = zones.find(z => z.type === "overflow")

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Storage Management</h2>
          <p className="text-slate-500 mt-1">Capacity planning, slotting, and tenant grouping.</p>
        </div>
        <button
          className="text-sm text-blue-600 hover:underline font-medium mt-1"
          onClick={() => navigateTo("settings")}
        >
          Configure in Settings →
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Layers className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCapacity}</div>
            <p className="text-xs text-slate-500">Pallet positions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.occupancyPercent}%</div>
            <Progress value={metrics.occupancyPercent} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empty Locations</CardTitle>
            <Box className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.emptyLocations}</div>
            <p className="text-xs text-slate-500">Available positions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overflow Usage</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.overflowUsage}</div>
            <p className="text-xs text-slate-500">Pallets in overflow</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenant-grouping">Tenant Grouping</TabsTrigger>
          <TabsTrigger value="fragmentation">
            Client Fragmentation
            {metrics.fragmentedTenants > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {metrics.fragmentedTenants}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
            {suggestionsByPriority.high.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {suggestionsByPriority.high.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Zones</CardTitle>
              <CardDescription>Select a zone to view rack details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {zones.map(zone => {
                  const pct = Math.round((zone.usedCapacity / zone.totalCapacity) * 100)
                  const isSelected = selectedZone === zone.id
                  return (
                    <div
                      key={zone.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-slate-900 bg-slate-50 shadow-sm dark:border-slate-400 dark:bg-slate-800' : 'border-slate-100 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'}`}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getZoneColor(zone.color)}`} />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{zone.name}</span>
                        </div>
                        {pct > 90 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{zone.usedCapacity} / {zone.totalCapacity}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" indicatorClassName={getZoneColor(zone.color)} />
                      </div>
                      <div className="mt-3 text-xs text-slate-500 capitalize">
                        Type: {zone.type.replace('_', ' ')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {selectedZone && (
            <Card>
              <CardHeader>
                <CardTitle>Racks in {zones.find(z => z.id === selectedZone)?.name}</CardTitle>
                <CardDescription>Select a rack to view location details.</CardDescription>
              </CardHeader>
              <CardContent>
                {racks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No racks found in this zone.</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-4">
                    {racks.map(rack => {
                      const pct = Math.round((rack.usedCapacity / rack.totalCapacity) * 100)
                      const isSelected = selectedRack === rack.id
                      return (
                        <div
                          key={rack.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
                          onClick={() => setSelectedRack(rack.id)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{rack.code}</span>
                            <div className={`w-2 h-2 rounded-full ${getRackStatusColor(rack.usedCapacity, rack.totalCapacity)}`} />
                          </div>
                          <div className="text-2xl font-light tracking-tight mb-1">{pct}%</div>
                          <div className="text-xs text-slate-500 mb-1">{rack.usedCapacity} / {rack.totalCapacity} pallets</div>
                          <div className="text-xs text-slate-400 mb-2">{rack.levelCount}L × {rack.bayCount}B</div>
                          {rack.preferredClientId && (
                            <Badge variant="secondary" className="text-[10px] w-full justify-center bg-slate-100 text-slate-600 hover:bg-slate-200">
                              {clientNameMap[rack.preferredClientId] ?? rack.preferredClientId}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedRack && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Rack {racks.find(r => r.id === selectedRack)?.code} Details</CardTitle>
                  <CardDescription>Location-level occupancy and inventory.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigateTo("inventory")}>
                  <ExternalLink className="h-3.5 w-3.5" /> View Inventory
                </Button>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No location details available for this rack.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Lvl/Bay</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Occupancy</TableHead>
                        <TableHead className="text-right">Pallets</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map(loc => {
                        const locItems = inventoryByLocation[loc.code] ?? []
                        return (
                          <TableRow key={loc.id}>
                            <TableCell className="font-mono text-xs font-medium">{loc.code}</TableCell>
                            <TableCell className="text-xs text-slate-500">L{loc.level} B{loc.bay}</TableCell>
                            <TableCell>
                              {loc.assignedClientId ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {clientNameMap[loc.assignedClientId] ?? loc.assignedClientId}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {locItems.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">Empty</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {locItems.map(item => (
                                    <span key={item.id} className="inline-flex items-center text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono" title={item.name}>
                                      {item.sku}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={loc.utilizationPercent} className="h-1.5 w-16" />
                                <span className="text-xs text-slate-500">{loc.utilizationPercent}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {loc.currentPallets} / {loc.maxPallets}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TENANT GROUPING ──────────────────────────────────── */}
        <TabsContent value="tenant-grouping" className="space-y-6 mt-4">
          {tenantGroupingStats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaries.length}</div>
                  <p className="text-xs text-slate-500 mt-1">Active tenants in warehouse</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Racks / Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantGroupingStats.avgRacks.toFixed(1)}</div>
                  <p className="text-xs text-slate-500 mt-1">Across all active clients</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Well Grouped</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{tenantGroupingStats.grouped}</div>
                  <p className="text-xs text-slate-500 mt-1">Clients consolidated efficiently</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Consolidation Opps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{tenantGroupingStats.consolidationOpps}</div>
                  <p className="text-xs text-slate-500 mt-1">Clients to re-slot</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Client Storage Distribution</CardTitle>
              <CardDescription>Pallet counts, rack usage, and grouping efficiency per client.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Pallets Stored</TableHead>
                    <TableHead className="text-center">Racks Used</TableHead>
                    <TableHead className="text-center">Pallets / Rack</TableHead>
                    <TableHead className="text-center">Grouping</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...summaries].sort((a, b) => b.palletsStored - a.palletsStored).map(summary => {
                    const efficiency = summary.racksUsed > 0 ? (summary.palletsStored / summary.racksUsed).toFixed(1) : '—'
                    return (
                      <TableRow key={summary.clientId} className={summary.fragmentationScore === 'high' ? 'bg-red-50/40 dark:bg-red-950/10' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{summary.clientName}</div>
                          <div className="text-xs text-slate-500">{summary.clientId}</div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{summary.palletsStored}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${summary.fragmentationScore === 'high' ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                            {summary.racksUsed}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">{efficiency}</TableCell>
                        <TableCell className="text-center">
                          {summary.fragmentationScore === 'high' ? (
                            <Badge variant="destructive" className="text-[10px]">Fragmented</Badge>
                          ) : summary.fragmentationScore === 'medium' ? (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Spread</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">Grouped</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {summary.fragmentationScore !== 'low' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700"
                              onClick={() => setActiveTab("fragmentation")}>
                              Review <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {tenantGroupingStats && tenantGroupingStats.consolidationOpps > 0 && (
            <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Consolidation Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-800 dark:text-blue-300">
                <p>
                  {tenantGroupingStats.consolidationOpps} client{tenantGroupingStats.consolidationOpps > 1 ? 's are' : ' is'} using more racks than necessary. Re-slotting could free up capacity and reduce picker travel by up to 20%.{" "}
                  <button className="font-semibold underline underline-offset-2 cursor-pointer" onClick={() => setActiveTab("fragmentation")}>
                    View Client Fragmentation
                  </button>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── CLIENT FRAGMENTATION ─────────────────────────────── */}
        <TabsContent value="fragmentation" className="space-y-6 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-red-100 dark:border-red-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> High Fragmentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{fragmentedClients.length}</div>
                <p className="text-xs text-slate-500 mt-1">Clients spread across too many racks</p>
              </CardContent>
            </Card>
            <Card className="border-amber-100 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-500" /> Moderately Spread
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{spreadClients.length}</div>
                <p className="text-xs text-slate-500 mt-1">Clients with minor distribution issues</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 dark:border-emerald-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Well Grouped
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{summaries.filter(s => s.fragmentationScore === 'low').length}</div>
                <p className="text-xs text-slate-500 mt-1">Clients efficiently consolidated</p>
              </CardContent>
            </Card>
          </div>

          {fragmentedClients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Fragmented Clients — Action Required
                </CardTitle>
                <CardDescription>
                  These clients are spread across multiple racks. Consolidation improves pick efficiency and frees capacity for new tenants.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fragmentedClients.map(client => {
                  const idealRacks = Math.max(1, Math.ceil(client.palletsStored / 20))
                  const wastedRacks = Math.max(0, client.racksUsed - idealRacks)
                  return (
                    <div key={client.clientId} className="p-4 rounded-lg border border-red-100 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{client.clientName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{client.palletsStored} pallets stored across {client.racksUsed} racks</div>
                        </div>
                        <Badge variant="destructive" className="text-[10px] shrink-0">Fragmented</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-red-100 dark:border-red-900">
                          <div className="text-lg font-bold text-red-600">{client.racksUsed}</div>
                          <div className="text-[10px] text-slate-500">Current racks</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900">
                          <div className="text-lg font-bold text-emerald-600">{idealRacks}</div>
                          <div className="text-[10px] text-slate-500">Ideal racks</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-slate-700">
                          <div className="text-lg font-bold text-amber-600">{wastedRacks}</div>
                          <div className="text-[10px] text-slate-500">Racks to free</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Consolidating to {idealRacks} rack{idealRacks > 1 ? 's' : ''} can reduce picker travel and free {wastedRacks} rack{wastedRacks !== 1 ? 's' : ''} for new tenants.
                        </p>
                        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => setActiveTab("recommendations")}>
                          See Recommendations <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {spreadClients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-500" /> Moderately Spread — Monitor
                </CardTitle>
                <CardDescription>Minor spread detected. Review if inbound volume is growing for these clients.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-center">Pallets</TableHead>
                      <TableHead className="text-center">Racks</TableHead>
                      <TableHead className="text-center">Density</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spreadClients.map(client => (
                      <TableRow key={client.clientId}>
                        <TableCell className="font-medium text-sm">{client.clientName}</TableCell>
                        <TableCell className="text-center">{client.palletsStored}</TableCell>
                        <TableCell className="text-center">{client.racksUsed}</TableCell>
                        <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">
                          {(client.palletsStored / client.racksUsed).toFixed(1)} pal/rack
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Monitor</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {fragmentedClients.length === 0 && spreadClients.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">No Fragmentation Issues</h3>
                <p className="text-sm text-slate-500 max-w-sm">All clients are well grouped. Check back after the next inbound wave.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── STORAGE RECOMMENDATIONS ──────────────────────────── */}
        <TabsContent value="recommendations" className="space-y-6 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-red-100 dark:border-red-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> High Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{suggestionsByPriority.high.length}</div>
                <p className="text-xs text-slate-500 mt-1">Requires immediate attention</p>
              </CardContent>
            </Card>
            <Card className="border-amber-100 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-500" /> Medium Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{suggestionsByPriority.medium.length}</div>
                <p className="text-xs text-slate-500 mt-1">Address within this week</p>
              </CardContent>
            </Card>
            <Card className="border-blue-100 dark:border-blue-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" /> Optimizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{suggestionsByPriority.low.length}</div>
                <p className="text-xs text-slate-500 mt-1">Low priority improvements</p>
              </CardContent>
            </Card>
          </div>

          {zonesAtRisk.length > 0 && (
            <Card className="border-red-100 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" /> Zones at Capacity Risk
                </CardTitle>
                <CardDescription>Zones above 85% utilization — plan overflow or reduce inbound to avoid disruption.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {zonesAtRisk.map(zone => {
                  const pct = Math.round((zone.usedCapacity / zone.totalCapacity) * 100)
                  return (
                    <div key={zone.id} className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getZoneColor(zone.color)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{zone.name}</span>
                          <span className={`font-bold ${pct >= 95 ? 'text-red-600' : 'text-amber-600'}`}>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="text-xs text-slate-500 mt-1">{zone.usedCapacity} / {zone.totalCapacity} positions used · {zone.totalCapacity - zone.usedCapacity} remaining</div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {(['high', 'medium', 'low'] as const).map(priority => {
            const group = suggestionsByPriority[priority]
            if (group.length === 0) return null
            const config = {
              high:   { label: 'High Priority — Act Now', icon: <AlertTriangle className="h-4 w-4" />, cardCls: 'border-red-100 dark:border-red-900',    headerCls: 'bg-red-50/30 dark:bg-red-950/10',    titleCls: 'text-red-700 dark:text-red-400' },
              medium: { label: 'Medium Priority',         icon: <Info className="h-4 w-4" />,          cardCls: 'border-amber-100 dark:border-amber-900', headerCls: 'bg-amber-50/30 dark:bg-amber-950/10', titleCls: 'text-amber-700 dark:text-amber-400' },
              low:    { label: 'Optimizations',           icon: <TrendingUp className="h-4 w-4" />,    cardCls: 'border-blue-100 dark:border-blue-900',   headerCls: 'bg-blue-50/30 dark:bg-blue-950/10',   titleCls: 'text-blue-700 dark:text-blue-400' },
            }[priority]
            return (
              <Card key={priority} className={`border ${config.cardCls}`}>
                <CardHeader className={`pb-3 ${config.headerCls}`}>
                  <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${config.titleCls}`}>
                    {config.icon} {config.label} ({group.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {group.map(suggestion => (
                    <div key={suggestion.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{suggestion.message}</p>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleSuggestionAction(suggestion)}
                        >
                          {suggestion.actionLabel} <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}

          {suggestions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">No Recommendations</h3>
                <p className="text-sm text-slate-500 max-w-sm">Storage is well optimized. Recommendations will appear when slotting improvements are identified.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── MODAL: Create Replenishment Task ─────────────────────── */}
      <Dialog open={activeModal === "task"} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Create Replenishment Task</DialogTitle>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            {modalSuggestion && (
              <p className="text-xs text-slate-500 mt-1 leading-snug">{modalSuggestion.message}</p>
            )}
          </DialogHeader>

          {modalSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
              <p className="font-semibold text-slate-900 dark:text-slate-100">Task Created</p>
              <p className="text-sm text-slate-500 mt-1">The replenishment task has been added to the queue.</p>
              <Button className="mt-4" onClick={closeModal}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Task Type</Label>
                    <Select value={taskForm.type} onValueChange={v => setTaskForm(f => ({ ...f, type: v as Task["type"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Putaway">Putaway</SelectItem>
                        <SelectItem value="Pick">Pick</SelectItem>
                        <SelectItem value="Receive">Receive</SelectItem>
                        <SelectItem value="Pack">Pack</SelectItem>
                        <SelectItem value="Return">Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v as Task["priority"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Zone / Location</Label>
                  <Input
                    value={taskForm.location}
                    onChange={e => setTaskForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Forward Pick"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Assignee</Label>
                    <Input
                      value={taskForm.assignee}
                      onChange={e => setTaskForm(f => ({ ...f, assignee: e.target.value }))}
                      placeholder="Name or team"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Items</Label>
                    <Input
                      type="number"
                      min={1}
                      value={taskForm.items}
                      onChange={e => setTaskForm(f => ({ ...f, items: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal} disabled={modalSubmitting}>Cancel</Button>
                <Button onClick={submitTask} disabled={modalSubmitting}>
                  {modalSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Task
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Overflow Capacity Info ────────────────────────── */}
      <Dialog open={activeModal === "overflow"} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Overflow Redirect — Update Rules</DialogTitle>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {modalSuggestion && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-300">
                {modalSuggestion.message}
              </div>
            )}
            {/* Source rack info */}
            {modalSuggestion?.associatedRackId && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Source Rack</p>
                <div className="flex items-center justify-between p-3 rounded-lg border border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{modalSuggestion.associatedRackId}</span>
                  <Badge variant="destructive" className="text-[10px]">100% Full</Badge>
                </div>
              </div>
            )}
            {/* Overflow zone status */}
            {overflowZone && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overflow Zone Capacity</p>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{overflowZone.name}</span>
                    <span className="font-bold text-amber-600">
                      {Math.round((overflowZone.usedCapacity / overflowZone.totalCapacity) * 100)}%
                    </span>
                  </div>
                  <Progress value={Math.round((overflowZone.usedCapacity / overflowZone.totalCapacity) * 100)} className="h-1.5" />
                  <p className="text-xs text-slate-500 mt-1.5">
                    {overflowZone.usedCapacity} / {overflowZone.totalCapacity} positions used · {overflowZone.totalCapacity - overflowZone.usedCapacity} available
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">
              New inbound pallets for this client will be directed to the Overflow Zone until the source rack is freed. Update your WMS routing rules accordingly.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Dismiss</Button>
            <Button onClick={() => { closeModal(); setActiveTab("overview") }}>
              View in Overview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Assign Rack to Client ─────────────────────────── */}
      <Dialog open={activeModal === "assign-rack"} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Assign Rack to Client</DialogTitle>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            {modalSuggestion && (
              <p className="text-xs text-slate-500 mt-1 leading-snug">{modalSuggestion.message}</p>
            )}
          </DialogHeader>

          {modalSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
              <p className="font-semibold text-slate-900 dark:text-slate-100">Rack Assigned</p>
              <p className="text-sm text-slate-500 mt-1">
                Rack <span className="font-mono font-medium">{modalSuggestion?.associatedRackId}</span> is now assigned to{" "}
                {clientNameMap[assignRackClientId] ?? assignRackClientId}.
              </p>
              <Button className="mt-4" onClick={closeModal}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rack</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{modalSuggestion?.associatedRackId}</span>
                    {modalSuggestion?.associatedZoneId && (
                      <Badge variant="outline" className="text-[10px]">
                        {zones.find(z => z.id === modalSuggestion.associatedZoneId)?.name ?? modalSuggestion.associatedZoneId}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign to Client</Label>
                  <Select value={assignRackClientId} onValueChange={setAssignRackClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length > 0
                        ? clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                        : summaries.map(s => (
                          <SelectItem key={s.clientId} value={s.clientId}>{s.clientName}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                {assignRackClientId && (
                  <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                    Rack <span className="font-mono font-medium">{modalSuggestion?.associatedRackId}</span> will be set as the preferred rack for{" "}
                    <span className="font-semibold">{clientNameMap[assignRackClientId] ?? assignRackClientId}</span>.
                    Pickers will prioritise this rack for putaway and picks for this client.
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal} disabled={modalSubmitting}>Cancel</Button>
                <Button onClick={submitAssignRack} disabled={modalSubmitting || !assignRackClientId}>
                  {modalSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm Assignment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
