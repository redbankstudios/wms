"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowDownToLine,
  Box,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  PackagePlus,
  Ruler,
  Truck,
  Weight,
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { Client, InboundShipment, InboundPallet, InboundBox, InboundBoxItem, Rack, WarehouseZone } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

// ─── Types ───────────────────────────────────────────────────────────────────

type DetailTab = "overview" | "pallets" | "locations"

interface RackSuggestion {
  rack: Rack
  zone: WarehouseZone
  availableSlots: number
  occupancyPercent: number
  isPreferred: boolean
  fragmentationWarning: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: InboundShipment["status"]) {
  switch (status) {
    case "scheduled":
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Scheduled</Badge>
    case "arrived":
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Arrived</Badge>
    case "receiving":
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Receiving</Badge>
    case "putaway":
      return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">Putaway</Badge>
    case "complete":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Complete</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getPalletStatusBadge(status: InboundPallet["status"]) {
  switch (status) {
    case "expected":   return <Badge variant="outline" className="border-slate-400 text-slate-500 text-xs">Expected</Badge>
    case "arrived":    return <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Arrived</Badge>
    case "receiving":  return <Badge className="bg-amber-500 text-white text-xs">Receiving</Badge>
    case "putaway":    return <Badge className="bg-emerald-500 text-white text-xs">Putaway</Badge>
    default:           return <Badge variant="outline" className="text-xs">{status}</Badge>
  }
}

function getPriority(arrivalDate: string, windowStart: string): "urgent" | "high" | "normal" {
  const now = new Date()
  const arrival = new Date(`${arrivalDate} ${windowStart}`)
  const hoursUntil = (arrival.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntil < 4) return "urgent"
  if (hoursUntil < 24) return "high"
  return "normal"
}

function computeSuggestions(pallets: InboundPallet[], racks: Rack[], zones: WarehouseZone[]): RackSuggestion[] {
  const clientIds = [...new Set(pallets.map(p => p.clientId).filter(Boolean))]
  const suggestions: RackSuggestion[] = []

  for (const clientId of clientIds) {
    const clientPallets = pallets.filter(p => p.clientId === clientId)

    // Preferred racks first
    const preferred = racks.filter(r => r.preferredClientId === clientId && r.usedCapacity < r.totalCapacity)
    const neutral = racks.filter(r => !r.preferredClientId && r.usedCapacity < r.totalCapacity)
    const other = racks.filter(r => r.preferredClientId && r.preferredClientId !== clientId && r.usedCapacity < r.totalCapacity)

    const candidates = [...preferred, ...neutral, ...other].slice(0, 3)

    for (const rack of candidates) {
      const zone = zones.find(z => z.id === rack.zoneId)
      if (!zone) continue
      const availableSlots = rack.totalCapacity - rack.usedCapacity
      const occupancyPercent = rack.totalCapacity > 0 ? Math.round((rack.usedCapacity / rack.totalCapacity) * 100) : 0
      const isPreferred = rack.preferredClientId === clientId
      const fragmentationWarning = !isPreferred && other.includes(rack)

      suggestions.push({ rack, zone, availableSlots, occupancyPercent, isPreferred, fragmentationWarning })
    }

    // If client pallets exceed preferred rack capacity, flag fragmentation
    if (preferred.length > 0) {
      const preferredCapacity = preferred.reduce((acc, r) => acc + (r.totalCapacity - r.usedCapacity), 0)
      if (clientPallets.length > preferredCapacity) {
        // already captured in fragmentationWarning above
      }
    }
  }

  return suggestions
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PalletAccordion({ pallet, api }: { pallet: InboundPallet; api: ReturnType<typeof getProvider> }) {
  const [open, setOpen] = React.useState(false)
  const [boxes, setBoxes] = React.useState<InboundBox[]>([])
  const [boxItems, setBoxItems] = React.useState<Record<string, InboundBoxItem[]>>({})
  const [expandedBox, setExpandedBox] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const togglePallet = async () => {
    if (!open && boxes.length === 0) {
      setLoading(true)
      const b = await api.inbound.getBoxesByPallet(pallet.id)
      setBoxes(b)
      setLoading(false)
    }
    setOpen(prev => !prev)
  }

  const toggleBox = async (boxId: string) => {
    if (expandedBox === boxId) {
      setExpandedBox(null)
      return
    }
    setExpandedBox(boxId)
    if (!boxItems[boxId]) {
      const items = await api.inbound.getBoxItems(boxId)
      setBoxItems(prev => ({ ...prev, [boxId]: items }))
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={togglePallet}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <Package className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-slate-900 text-sm">Pallet {pallet.palletNumber}</span>
          {getPalletStatusBadge(pallet.status)}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {pallet.length && pallet.width && pallet.height && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              {pallet.length} × {pallet.width} × {pallet.height}
            </span>
          )}
          {pallet.weight && (
            <span className="flex items-center gap-1">
              <Weight className="h-3 w-3" />
              {pallet.weight}
            </span>
          )}
          {pallet.assignedLocationCode && (
            <span className="text-indigo-600 font-medium">→ {pallet.assignedLocationCode}</span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 bg-white space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : boxes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No boxes recorded for this pallet.</p>
          ) : (
            boxes.map(box => (
              <div key={box.id} className="border border-slate-100 rounded-md overflow-hidden ml-4">
                <button
                  onClick={() => toggleBox(box.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/60 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {expandedBox === box.id ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                    <Box className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700">Box {box.boxNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {box.length && box.width && box.height && (
                      <span>{box.length} × {box.width} × {box.height}</span>
                    )}
                    {box.weight && <span>{box.weight}</span>}
                  </div>
                </button>

                {expandedBox === box.id && (
                  <div className="px-3 py-2 bg-white">
                    {!boxItems[box.id] ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                      </div>
                    ) : boxItems[box.id].length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No items.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="text-left py-1 font-medium">SKU</th>
                            <th className="text-left py-1 font-medium">Product</th>
                            <th className="text-right py-1 font-medium">Qty</th>
                            <th className="text-right py-1 font-medium">Unit Dims</th>
                            <th className="text-right py-1 font-medium">Unit Wt.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boxItems[box.id].map(item => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0">
                              <td className="py-1 font-mono text-slate-500">{item.sku}</td>
                              <td className="py-1 text-slate-700">{item.productName}</td>
                              <td className="py-1 text-right font-medium text-slate-900">{item.quantity}</td>
                              <td className="py-1 text-right text-slate-500">{item.unitDimensions ?? "—"}</td>
                              <td className="py-1 text-right text-slate-500">{item.unitWeight ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function LocationsTab({
  shipment,
  pallets,
  racks,
  zones,
  onConfirm,
  confirming,
}: {
  shipment: InboundShipment
  pallets: InboundPallet[]
  racks: Rack[]
  zones: WarehouseZone[]
  onConfirm: () => Promise<void>
  confirming: boolean
}) {
  const [overrides, setOverrides] = React.useState<Record<string, string>>({})
  const suggestions = React.useMemo(() => computeSuggestions(pallets, racks, zones), [pallets, racks, zones])

  const isComplete = shipment.status === "complete"

  const fragmented = suggestions.filter(s => s.fragmentationWarning)
  const consolidationNeeded = suggestions.some(s => !s.isPreferred && !s.fragmentationWarning)

  return (
    <div className="space-y-5">
      {/* Auto-suggestions card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Auto-Suggested Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No rack data available. Ensure storage zones are configured.</p>
          ) : (
            suggestions.map(s => (
              <div
                key={s.rack.id}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  s.isPreferred
                    ? "border-emerald-200 bg-emerald-50"
                    : s.fragmentationWarning
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">{s.rack.code}</span>
                    <span className="text-xs text-slate-500">— {s.zone.name}</span>
                    {s.isPreferred && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0 border-0">Preferred</Badge>
                    )}
                    {s.fragmentationWarning && (
                      <Badge className="bg-red-100 text-red-600 text-xs px-1.5 py-0 border-0 flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> Fragmentation
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {s.availableSlots} slots free · {s.occupancyPercent}% occupied
                  </p>
                </div>
                <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden self-center">
                  <div
                    className={`h-full rounded-full ${s.occupancyPercent >= 90 ? "bg-red-500" : s.occupancyPercent >= 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${s.occupancyPercent}%` }}
                  />
                </div>
              </div>
            ))
          )}

          {consolidationNeeded && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Some pallets are assigned to non-preferred racks. Consider consolidating existing stock first to free preferred rack space.</span>
            </div>
          )}
          {fragmented.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{fragmented.length} rack{fragmented.length > 1 ? "s" : ""} would mix this client's pallets with another client's stock — high fragmentation risk.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-pallet assignment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pallet Location Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pallets.map(pallet => {
              const assignedCode = overrides[pallet.id] ?? pallet.assignedLocationCode ?? ""
              return (
                <div key={pallet.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">Pallet {pallet.palletNumber}</span>
                    {getPalletStatusBadge(pallet.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {assignedCode ? (
                      <span className="text-sm font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{assignedCode}</span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                    {!isComplete && (
                      <select
                        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        value={overrides[pallet.id] ?? ""}
                        onChange={e => setOverrides(prev => ({ ...prev, [pallet.id]: e.target.value }))}
                      >
                        <option value="">Override…</option>
                        {racks.map(r => (
                          <option key={r.id} value={r.code}>{r.code} ({r.totalCapacity - r.usedCapacity} free)</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rack grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Storage Rack Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Available</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Partial</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Full</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" /> Assigned (inbound)</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {racks.map(rack => {
              const pct = rack.totalCapacity > 0 ? (rack.usedCapacity / rack.totalCapacity) * 100 : 0
              const isAssigned = pallets.some(p => (overrides[p.id] ?? p.assignedRackId) === rack.id)
              const color = isAssigned
                ? "bg-indigo-100 border-indigo-400 text-indigo-700"
                : pct >= 100
                ? "bg-red-100 border-red-300 text-red-600"
                : pct >= 70
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : "bg-emerald-100 border-emerald-300 text-emerald-700"

              return (
                <div
                  key={rack.id}
                  className={`border rounded-md p-2 cursor-pointer hover:opacity-80 transition-opacity ${color}`}
                  title={`${rack.code} — ${rack.usedCapacity}/${rack.totalCapacity} used`}
                >
                  <p className="text-xs font-semibold">{rack.code}</p>
                  <p className="text-xs opacity-70">{Math.round(pct)}% full</p>
                  <div className="mt-1 h-1 rounded-full bg-current opacity-20 overflow-hidden">
                    <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!isComplete && (
        <Button
          className="w-full bg-slate-900 hover:bg-slate-800 text-white"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Tasks…</>
          ) : (
            <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Inbound & Create Tasks</>
          )}
        </Button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InboundManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [shipments, setShipments] = React.useState<InboundShipment[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [selected, setSelected] = React.useState<InboundShipment | null>(null)
  const [detailTab, setDetailTab] = React.useState<DetailTab>("overview")
  const [pallets, setPallets] = React.useState<InboundPallet[]>([])
  const [racks, setRacks] = React.useState<Rack[]>([])
  const [zones, setZones] = React.useState<WarehouseZone[]>([])
  const [loading, setLoading] = React.useState(true)
  const [palletsLoading, setPalletsLoading] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [showNewForm, setShowNewForm] = React.useState(false)

  const clientNameMap = React.useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients]
  )

  // Load shipments + rack data on mount
  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const [s, z, c] = await Promise.all([
        api.inbound.getInboundByTenant(selectedTenant.id),
        api.storage.getWarehouseZones(selectedTenant.id),
        api.clients.getClientsByTenant(selectedTenant.id),
      ])
      setShipments(s)
      setZones(z)
      setClients(c)

      // Load all racks across zones
      const allRacks: Rack[] = []
      for (const zone of z) {
        const r = await api.storage.getRacksByZone(selectedTenant.id, zone.id)
        allRacks.push(...r)
      }
      setRacks(allRacks)
      setLoading(false)
    }
    load()
  }, [api, selectedTenant.id])

  const selectShipment = async (s: InboundShipment) => {
    setSelected(s)
    setDetailTab("overview")
    setPalletsLoading(true)
    const p = await api.inbound.getPalletsByShipment(s.id)
    setPallets(p)
    setPalletsLoading(false)
  }

  const handleConfirm = async () => {
    if (!selected) return
    setConfirming(true)
    try {
      const priority = getPriority(selected.arrivalDate, selected.arrivalWindowStart)

      // 1 Receive task for the shipment
      await api.tasks.createTask({
        tenantId: selected.tenantId,
        type: "Receive",
        status: "pending",
        assignee: "Unassigned",
        location: `Rec Dock • Door ${selected.dockDoor}`,
        items: selected.totalPallets,
        priority,
      })

      // 1 Putaway task per pallet
      for (const pallet of pallets) {
        await api.tasks.createTask({
          tenantId: selected.tenantId,
          type: "Putaway",
          status: "pending",
          assignee: "Unassigned",
          location: pallet.assignedLocationCode ?? `Zone • Unassigned`,
          items: 1,
          priority,
        })
      }

      // Update local shipment status to "receiving"
      setShipments(prev =>
        prev.map(s => s.id === selected.id ? { ...s, status: "receiving" as const } : s)
      )
      setSelected(prev => prev ? { ...prev, status: "receiving" as const } : prev)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Inbound</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage incoming shipments, pallets, and storage pre-assignments</p>
        </div>
        <Button onClick={() => setShowNewForm(true)} className="flex items-center gap-2">
          <PackagePlus className="h-4 w-4" />
          New Inbound
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-4">
        {(["scheduled", "arrived", "receiving", "putaway", "complete"] as const).map(status => {
          const count = shipments.filter(s => s.status === status).length
          const labels: Record<string, string> = { scheduled: "Scheduled", arrived: "Arrived", receiving: "In Progress", putaway: "Putaway", complete: "Completed" }
          return (
            <Card key={status} className="border-slate-200">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{labels[status]}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main split layout */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Left: shipment list */}
        <div className="w-80 shrink-0 space-y-2">
          {shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
              <ArrowDownToLine className="h-8 w-8 mb-2 opacity-40" />
              No inbound shipments
            </div>
          ) : (
            shipments.map(s => (
              <button
                key={s.id}
                onClick={() => selectShipment(s)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selected?.id === s.id
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-slate-400 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs font-mono ${selected?.id === s.id ? "text-slate-400" : "text-slate-400"}`}>{s.referenceNumber}</span>
                  {getStatusBadge(s.status)}
                </div>
                <p className={`font-semibold text-sm ${selected?.id === s.id ? "text-white" : "text-slate-900"}`}>{clientNameMap[s.clientId] ?? s.clientId}</p>
                <div className={`flex items-center gap-2 mt-1 text-xs ${selected?.id === s.id ? "text-slate-300" : "text-slate-500"}`}>
                  <Clock className="h-3 w-3" />
                  {s.arrivalDate} · {s.arrivalWindowStart}–{s.arrivalWindowEnd}
                </div>
                <div className={`flex items-center gap-2 mt-1 text-xs ${selected?.id === s.id ? "text-slate-300" : "text-slate-500"}`}>
                  <Package className="h-3 w-3" />
                  {s.totalPallets} pallets
                  {s.dockDoor && <><Truck className="h-3 w-3 ml-1" /> Door {s.dockDoor}</>}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            {/* Detail header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(selected.status)}
                  <span className="text-xs text-slate-400 font-mono">{selected.referenceNumber}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{clientNameMap[selected.clientId] ?? selected.clientId}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  {selected.arrivalDate} · {selected.arrivalWindowStart} – {selected.arrivalWindowEnd}
                  {selected.dockDoor && <span className="ml-2 flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Door {selected.dockDoor}</span>}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              {(["overview", "pallets", "locations"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    detailTab === tab
                      ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5 overflow-y-auto max-h-[480px]">
              {/* Overview tab */}
              {detailTab === "overview" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Carrier</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Truck className="h-4 w-4 text-slate-400" />{selected.carrier || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Arrival Window</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" />{selected.arrivalDate} · {selected.arrivalWindowStart} – {selected.arrivalWindowEnd}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Dock Door</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">Door {selected.dockDoor || "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Pallets</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Package className="h-4 w-4 text-slate-400" />{selected.totalPallets}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Priority</p>
                      {(() => {
                        const p = getPriority(selected.arrivalDate, selected.arrivalWindowStart)
                        return p === "urgent"
                          ? <Badge className="bg-red-500">Urgent</Badge>
                          : p === "high"
                          ? <Badge className="bg-amber-500">High</Badge>
                          : <Badge variant="outline">Normal</Badge>
                      })()}
                    </div>
                    {selected.notes && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded p-2">{selected.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pallets tab */}
              {detailTab === "pallets" && (
                <div className="space-y-3">
                  {palletsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : pallets.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No pallets recorded for this shipment.</p>
                  ) : (
                    pallets.map(pallet => (
                      <PalletAccordion key={pallet.id} pallet={pallet} api={api} />
                    ))
                  )}
                </div>
              )}

              {/* Locations tab */}
              {detailTab === "locations" && (
                palletsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <LocationsTab
                    shipment={selected}
                    pallets={pallets}
                    racks={racks}
                    zones={zones}
                    onConfirm={handleConfirm}
                    confirming={confirming}
                  />
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg text-slate-400">
            <ArrowDownToLine className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Select a shipment to view details</p>
          </div>
        )}
      </div>

      {/* New Inbound slide-over */}
      {showNewForm && (
        <NewInboundForm
          tenantId={selectedTenant.id}
          api={api}
          clients={clients}
          onClose={() => setShowNewForm(false)}
          onCreated={s => {
            setShipments(prev => [s, ...prev])
            setShowNewForm(false)
            selectShipment(s)
          }}
        />
      )}
    </div>
  )
}

// ─── New Inbound Form ─────────────────────────────────────────────────────────

function NewInboundForm({
  tenantId,
  api,
  clients,
  onClose,
  onCreated,
}: {
  tenantId: string
  api: ReturnType<typeof getProvider>
  clients: Client[]
  onClose: () => void
  onCreated: (s: InboundShipment) => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    clientId: "",
    referenceNumber: "",
    carrier: "",
    arrivalDate: "",
    arrivalWindowStart: "",
    arrivalWindowEnd: "",
    dockDoor: "",
    notes: "",
    totalPallets: 1,
  })

  const set = (key: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const shipment = await api.inbound.createInbound({
        tenantId,
        ...form,
        status: "scheduled",
      })
      onCreated(shipment)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[480px] bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">New Inbound Shipment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client</label>
              <select required className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                value={form.clientId} onChange={e => set("clientId", e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reference #</label>
              <input required className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="REF-TC-20231028" value={form.referenceNumber} onChange={e => set("referenceNumber", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Carrier</label>
              <input className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="UPS Freight" value={form.carrier} onChange={e => set("carrier", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dock Door</label>
              <input className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="1" value={form.dockDoor} onChange={e => set("dockDoor", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Arrival Date</label>
            <input required type="text" className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Oct 28, 2023" value={form.arrivalDate} onChange={e => set("arrivalDate", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Window Start</label>
              <input className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="09:00 AM" value={form.arrivalWindowStart} onChange={e => set("arrivalWindowStart", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Window End</label>
              <input className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="11:00 AM" value={form.arrivalWindowEnd} onChange={e => set("arrivalWindowEnd", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Pallets</label>
            <input required type="number" min={1} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              value={form.totalPallets} onChange={e => set("totalPallets", Number(e.target.value))} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</label>
            <textarea rows={3} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
              placeholder="Handling instructions, temperature requirements…"
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Create Shipment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
