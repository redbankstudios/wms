"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Layers, Package, AlertTriangle, ArrowRight, Loader2, Box, Info, ExternalLink } from "lucide-react"
import { WarehouseZone, Rack, StorageLocation, TenantStorageSummary, PutawaySuggestion, Client, InventoryItem } from "@/types"
import { useDemo } from "@/context/DemoContext"
import { getProvider } from "@/data"

function navigateTo(tab: string) {
  window.history.pushState(null, "", `/?tab=${tab}`)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export function StorageManagement() {
  const { selectedTenant } = useDemo()
  const api = React.useMemo(() => getProvider(), [])
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

  const tenantId = selectedTenant.id

  const clientNameMap = React.useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients]
  )

  // Group inventory items by their location code for quick lookup
  const inventoryByLocation = React.useMemo(() => {
    const map: Record<string, InventoryItem[]> = {}
    for (const item of inventoryItems) {
      if (!item.location) continue
      if (!map[item.location]) map[item.location] = []
      map[item.location].push(item)
    }
    return map
  }, [inventoryItems])

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

      if (z.length > 0) {
        setSelectedZone(z[0].id)
      }
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

  if (loading || !metrics) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const getZoneColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-500",
      emerald: "bg-emerald-500",
      amber: "bg-amber-500",
      red: "bg-red-500",
      slate: "bg-slate-500"
    }
    return colors[color] || "bg-slate-500"
  }

  const getRackStatusColor = (used: number, total: number) => {
    const pct = (used / total) * 100
    if (pct >= 95) return "bg-red-500"
    if (pct >= 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Storage Management</h2>
          <p className="text-slate-500 mt-1">Capacity planning, slotting, and tenant grouping.</p>
        </div>
        <div />
      </div>

      {/* A. Storage Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
        <Card className="col-span-2 bg-slate-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Tenant Fragmentation</CardTitle>
            <Info className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">{metrics.fragmentedTenants} Clients</div>
                <p className="text-xs text-slate-400">Spread across too many racks</p>
              </div>
              <Button size="sm" variant="secondary" className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700">View Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Zones & Racks */}
        <div className="md:col-span-8 space-y-6">
          
          {/* B. Zone Overview */}
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
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getZoneColor(zone.color)}`} />
                          <span className="font-semibold text-slate-900">{zone.name}</span>
                        </div>
                        {pct > 90 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{zone.usedCapacity} / {zone.totalCapacity}</span>
                          <span className="font-medium text-slate-900">{pct}%</span>
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

          {/* C. Rack Capacity Grid */}
          {selectedZone && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Racks in {zones.find(z => z.id === selectedZone)?.name}</CardTitle>
                  <CardDescription>Select a rack to view location details.</CardDescription>
                </div>
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
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
                          onClick={() => setSelectedRack(rack.id)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-slate-900">{rack.code}</span>
                            <div className={`w-2 h-2 rounded-full ${getRackStatusColor(rack.usedCapacity, rack.totalCapacity)}`} />
                          </div>
                          <div className="text-2xl font-light tracking-tight mb-1">{pct}%</div>
                          <div className="text-xs text-slate-500 mb-2">{rack.usedCapacity} / {rack.totalCapacity} pallets</div>
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

          {/* D. Rack Detail / Location Breakdown */}
          {selectedRack && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Rack {racks.find(r => r.id === selectedRack)?.code} Details</CardTitle>
                  <CardDescription>Location-level occupancy and inventory.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                  onClick={() => navigateTo("inventory")}>
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
        </div>

        {/* Right Column: Insights & Guidance */}
        <div className="md:col-span-4 space-y-6">
          
          {/* E. Tenant Grouping / Fragmentation */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Grouping</CardTitle>
              <CardDescription>Storage fragmentation analysis.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Racks</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map(summary => (
                    <TableRow key={summary.clientId} className={summary.fragmentationScore === 'high' ? 'bg-red-50/30' : ''}>
                      <TableCell>
                        <div className="font-medium text-sm">{summary.clientName}</div>
                        <div className="text-xs text-slate-500">{summary.palletsStored} pallets</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${summary.fragmentationScore === 'high' ? 'text-red-600' : 'text-slate-700'}`}>
                          {summary.racksUsed}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {summary.fragmentationScore === 'high' ? (
                          <Badge variant="destructive" className="text-[10px]">Fragmented</Badge>
                        ) : summary.fragmentationScore === 'medium' ? (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Spread</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">Grouped</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* F. Putaway Guidance */}
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="text-blue-900 flex items-center text-base">
                <Layers className="h-4 w-4 mr-2 text-blue-500" />
                Storage Recommendations
              </CardTitle>
              <CardDescription className="text-blue-700/80 text-xs">Simulated putaway and slotting guidance.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {suggestions.map(suggestion => (
                <div key={suggestion.id} className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-start mb-2">
                    {suggestion.priority === 'high' ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 shrink-0" />
                    ) : suggestion.priority === 'medium' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm text-slate-700 leading-snug">{suggestion.message}</p>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      {suggestion.actionLabel} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
