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
  Search,
  Truck,
  Weight,
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ScanLine,
  Send,
  RefreshCw,
  MapPin,
  MoveRight,
} from "lucide-react"
import { Client, InboundShipment, InboundPallet, InboundBox, InboundBoxItem, Rack, WarehouseZone } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

// ─── Types ───────────────────────────────────────────────────────────────────

type DetailTab = "overview" | "pallets" | "locations" | "receiving" | "putaway"

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

// ─── Derived shipment counts ──────────────────────────────────────────────────
// Counts are derived by traversing the inbound hierarchy:
// InboundShipment → InboundPallet[] → InboundBox[] → InboundBoxItem[]
//
// skus = distinct SKU strings across all box items (not line-item count)
// units = sum of InboundBoxItem.quantity across all box items

interface ShipmentCounts {
  boxes: number
  skus: number   // distinct SKU strings
  units: number  // sum of item.quantity
}

async function computeShipmentCounts(
  shipmentId: string,
  api: ReturnType<typeof getProvider>
): Promise<ShipmentCounts> {
  const pallets = await api.inbound.getPalletsByShipment(shipmentId)
  const boxArrays = await Promise.all(pallets.map(p => api.inbound.getBoxesByPallet(p.id)))
  const allBoxes = boxArrays.flat()
  const itemArrays = await Promise.all(allBoxes.map(b => api.inbound.getBoxItems(b.id)))
  const allItems = itemArrays.flat()
  return {
    boxes: allBoxes.length,
    skus: new Set(allItems.map(i => i.sku)).size,
    units: allItems.reduce((sum, i) => sum + i.quantity, 0),
  }
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
              <span>{fragmented.length} rack{fragmented.length > 1 ? "s" : ""} would mix this client&apos;s pallets with another client&apos;s stock — high fragmentation risk.</span>
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

// ─── Receiving Tab ────────────────────────────────────────────────────────────

const UOM_OPTIONS = ["each", "pack", "case", "pallet", "kg", "lb", "liter", "box"]

interface ExceptionUI {
  id: string
  exceptionType: string
  barcode: string | null
  sku: string | null
  expectedQty: number | null
  receivedQty: number | null
  status: string
  scanId: string | null
  scanMovementId: string | null
}

interface ProductOption {
  id: string
  sku: string
}

function exceptionTypeBadge(type: string) {
  const map: Record<string, string> = {
    unknown_barcode: "bg-purple-500",
    sku_mismatch:    "bg-orange-500",
    overage:         "bg-yellow-500",
    shortage:        "bg-red-500",
    damaged:         "bg-pink-500",
    missing_item:    "bg-slate-500",
  }
  return (
    <Badge className={`${map[type] ?? "bg-slate-400"} text-white text-xs`}>
      {type.replace("_", " ")}
    </Badge>
  )
}

function ExceptionsPanel({
  exceptions,
  tenantId,
  onResolved,
}: {
  exceptions: ExceptionUI[]
  tenantId: string
  onResolved: () => void
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [products, setProducts] = React.useState<ProductOption[]>([])
  const [productsLoaded, setProductsLoaded] = React.useState(false)
  const [form, setForm] = React.useState({
    productId: "", uomCode: "each", qtyPerUnit: 1, isPrimary: false,
    repostScan: true, resolutionNotes: "",
  })
  const [resolving, setResolving] = React.useState(false)
  const [resolveError, setResolveError] = React.useState<string | null>(null)

  const openExceptions = exceptions.filter(e => e.status === "open")

  const loadProducts = async () => {
    if (productsLoaded) return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=id,sku&tenant_id=eq.${tenantId}`,
        { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } }
      )
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
      setProductsLoaded(true)
    } catch {
      setProducts([])
    }
  }

  const expand = async (id: string, type: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setResolveError(null)
    if (type === "unknown_barcode") loadProducts()
  }

  const submitResolveBarcode = async (exId: string) => {
    if (!form.productId) { setResolveError("Select a product."); return }
    if (form.qtyPerUnit < 1) { setResolveError("Qty per unit must be ≥ 1."); return }
    setResolving(true)
    setResolveError(null)
    try {
      const res = await fetch(`/api/receiving/exceptions/${exId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, action: "resolve_barcode",
          productId: form.productId, uomCode: form.uomCode,
          qtyPerUnit: form.qtyPerUnit, isPrimary: form.isPrimary,
          repostScan: form.repostScan, resolutionNotes: form.resolutionNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to resolve")
      setExpandedId(null)
      setForm({ productId: "", uomCode: "each", qtyPerUnit: 1, isPrimary: false, repostScan: true, resolutionNotes: "" })
      onResolved()
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setResolving(false)
    }
  }

  const submitGenericAction = async (exId: string, action: "approve" | "reject" | "resolve") => {
    setResolving(true)
    setResolveError(null)
    try {
      const res = await fetch(`/api/receiving/exceptions/${exId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, action,
          resolutionAction: action === "resolve" ? "dismissed" : undefined,
          notes: form.resolutionNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setExpandedId(null)
      onResolved()
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setResolving(false)
    }
  }

  if (openExceptions.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        {openExceptions.length} open exception{openExceptions.length !== 1 ? "s" : ""}
      </p>

      {openExceptions.map(ex => (
        <div key={ex.id} className="border border-red-200 rounded-lg overflow-hidden">
          {/* Row header */}
          <button
            onClick={() => expand(ex.id, ex.exceptionType)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-red-50 hover:bg-red-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {exceptionTypeBadge(ex.exceptionType)}
              {ex.barcode && <span className="font-mono text-xs text-slate-600">{ex.barcode}</span>}
              {ex.sku && <span className="text-xs text-slate-500">SKU: {ex.sku}</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {ex.expectedQty !== null && <span>Exp: {ex.expectedQty}</span>}
              {ex.receivedQty !== null && <span>Got: {ex.receivedQty}</span>}
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedId === ex.id ? "rotate-90" : ""}`} />
            </div>
          </button>

          {/* Resolution panel */}
          {expandedId === ex.id && (
            <div className="px-3 py-3 bg-white space-y-3 border-t border-red-100">
              {ex.exceptionType === "unknown_barcode" ? (
                <>
                  <p className="text-xs text-slate-500">
                    Barcode <span className="font-mono font-medium">{ex.barcode}</span> is not registered.
                    Select the product it belongs to and save it for future scans.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 font-medium">Product</label>
                      <select
                        className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        value={form.productId}
                        onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                      >
                        <option value="">Select product…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} ({p.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-medium">UOM</label>
                      <select
                        className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        value={form.uomCode}
                        onChange={e => setForm(f => ({ ...f, uomCode: e.target.value }))}
                      >
                        {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 font-medium">Qty per unit</label>
                      <input
                        type="number" min={1}
                        className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        value={form.qtyPerUnit}
                        onChange={e => setForm(f => ({ ...f, qtyPerUnit: Math.max(1, Number(e.target.value)) }))}
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 mt-4">
                      <input type="checkbox" checked={form.repostScan} onChange={e => setForm(f => ({ ...f, repostScan: e.target.checked }))} />
                      Re-post scan to ledger
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 mt-4">
                      <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                      Primary barcode
                    </label>
                  </div>
                  <input
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="Resolution notes (optional)"
                    value={form.resolutionNotes}
                    onChange={e => setForm(f => ({ ...f, resolutionNotes: e.target.value }))}
                  />
                  {resolveError && <p className="text-xs text-red-500">{resolveError}</p>}
                  <Button
                    onClick={() => submitResolveBarcode(ex.id)}
                    disabled={resolving}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  >
                    {resolving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Save Barcode & Resolve
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    {ex.exceptionType === "shortage" && `Expected ${ex.expectedQty ?? "?"} units — only ${ex.receivedQty ?? 0} received.`}
                    {ex.exceptionType === "overage"  && `Received ${ex.receivedQty ?? "?"} units — expected only ${ex.expectedQty ?? "?"}.`}
                    {ex.exceptionType === "sku_mismatch" && `SKU ${ex.sku ?? ex.barcode} not in shipment manifest.`}
                    {ex.exceptionType === "damaged"  && `Item reported as damaged.`}
                    {ex.exceptionType === "missing_item" && `Expected item not received.`}
                  </p>
                  <input
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="Supervisor notes (optional)"
                    value={form.resolutionNotes}
                    onChange={e => setForm(f => ({ ...f, resolutionNotes: e.target.value }))}
                  />
                  {resolveError && <p className="text-xs text-red-500">{resolveError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={() => submitGenericAction(ex.id, "approve")} disabled={resolving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                      Approve
                    </Button>
                    <Button onClick={() => submitGenericAction(ex.id, "resolve")} disabled={resolving}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                      Dismiss
                    </Button>
                    <Button onClick={() => submitGenericAction(ex.id, "reject")} disabled={resolving}
                      variant="outline" className="flex-1 text-xs h-8 border-red-300 text-red-600 hover:bg-red-50">
                      Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

type ScanOutcome = "matched" | "unmatched" | "exception" | "posted"

interface ScanRecord {
  scanId: string
  inputValue: string
  entryMode: "barcode" | "sku"
  sku: string | null
  scannedQty: number
  resolvedBaseQty: number | null
  expectedQty: number | null
  outcome: ScanOutcome
  exceptionCode: string | null
  movementId: string | null
}

interface LastScanResult {
  inputValue: string
  entryMode: "barcode" | "sku"
  sku: string | null
  outcome: ScanOutcome | "sku_not_found"
  exceptionCode: string | null
}

function outcomeBadge(outcome: ScanOutcome, exCode: string | null) {
  if (outcome === "posted")    return <Badge className="bg-emerald-500 text-white text-xs">Posted</Badge>
  if (outcome === "matched")   return <Badge className="bg-blue-500 text-white text-xs">Matched</Badge>
  if (outcome === "exception") return <Badge className="bg-red-500 text-white text-xs">{exCode ?? "Exception"}</Badge>
  return <Badge variant="outline" className="text-xs">Unmatched</Badge>
}

function ReceivingTab({
  shipment,
  tenantId,
}: {
  shipment: InboundShipment
  tenantId: string
}) {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = React.useState<string | null>(null)
  const [opening, setOpening] = React.useState(false)
  const [finalizing, setFinalizing] = React.useState(false)

  const [entryMode, setEntryMode] = React.useState<"barcode" | "sku">("barcode")
  const [inputValue, setInputValue] = React.useState("")
  const [scannedQty, setScannedQty] = React.useState(1)
  const [scanning, setScanning] = React.useState(false)
  const [scans, setScans] = React.useState<ScanRecord[]>([])
  const [scanError, setScanError] = React.useState<string | null>(null)
  const [lastResult, setLastResult] = React.useState<LastScanResult | null>(null)
  const [exceptions, setExceptions] = React.useState<ExceptionUI[]>([])

  const [summary, setSummary] = React.useState<{
    totalScans: number
    postedScans: number
    exceptionCount: number
  } | null>(null)

  const loadExceptions = React.useCallback(async () => {
    if (!tenantId) return
    try {
      const res = await fetch(
        `/api/receiving/exceptions?tenantId=${tenantId}&shipmentId=${shipment.id}&status=open`
      )
      if (!res.ok) return
      const data = await res.json()
      setExceptions((data.exceptions ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        exceptionType: e.exceptionType as string,
        barcode: (e.barcode as string | null) ?? null,
        sku: (e.sku as string | null) ?? null,
        expectedQty: (e.expectedQty as number | null) ?? null,
        receivedQty: (e.receivedQty as number | null) ?? null,
        status: e.status as string,
        scanId: (e.scanId as string | null) ?? null,
        scanMovementId: null,
      })))
    } catch {
      // non-fatal
    }
  }, [tenantId, shipment.id])

  const openSession = async () => {
    setOpening(true)
    setScanError(null)
    try {
      const res = await fetch("/api/receiving/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, shipmentId: shipment.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to open session")
      setSessionId(data.sessionId)
      setSessionStatus("open")
      await loadExceptions()
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setOpening(false)
    }
  }

  const submitScan = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!sessionId || !trimmed) return
    setScanning(true)
    setScanError(null)
    setLastResult(null)
    try {
      const body: Record<string, unknown> = {
        tenantId,
        sessionId,
        shipmentId: shipment.id,
        scannedQty,
        postToLedger: true,
        entryMode,
      }
      if (entryMode === "barcode") body.barcode = trimmed
      else body.sku = trimmed

      const res = await fetch("/api/receiving/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      // SKU not found — clean validation error, no scan created
      if (!res.ok && data.code === "sku_not_found") {
        setLastResult({ inputValue: trimmed, entryMode, sku: null, outcome: "sku_not_found", exceptionCode: null })
        return
      }
      if (!res.ok) throw new Error(data.error ?? "Scan failed")

      const record: ScanRecord = {
        scanId: data.scanId,
        inputValue: trimmed,
        entryMode,
        sku: data.resolvedSku,
        scannedQty,
        resolvedBaseQty: data.resolvedBaseQty,
        expectedQty: data.expectedQty,
        outcome: data.outcome,
        exceptionCode: data.exceptionCode,
        movementId: data.movementId ?? null,
      }
      setScans(prev => [record, ...prev])
      setLastResult({ inputValue: trimmed, entryMode, sku: data.resolvedSku, outcome: data.outcome, exceptionCode: data.exceptionCode })
      setInputValue("")
      setScannedQty(1)
      if (data.outcome === "exception") await loadExceptions()
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setScanning(false)
    }
  }

  const finalize = async () => {
    if (!sessionId) return
    setFinalizing(true)
    setScanError(null)
    try {
      const res = await fetch(`/api/receiving/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, action: "finalize" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Finalize failed")
      setSessionStatus("completed")
      setSummary({
        totalScans: data.summary.totalScans,
        postedScans: data.summary.postedScans,
        exceptionCount: data.summary.exceptionCount,
      })
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setFinalizing(false)
    }
  }

  const postedCount = scans.filter(s => s.outcome === "posted").length
  const exceptionCount = scans.filter(s => s.outcome === "exception").length

  // Session not yet opened
  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ScanLine className="h-12 w-12 text-slate-300" />
        <div className="text-center">
          <p className="font-medium text-slate-700 dark:text-slate-200">No active receiving session</p>
          <p className="text-xs text-slate-400 mt-1">Open a session to start scanning items against this shipment</p>
        </div>
        {scanError && <p className="text-xs text-red-500">{scanError}</p>}
        <Button
          onClick={openSession}
          disabled={opening}
          className="bg-slate-900 hover:bg-slate-800 text-white mt-2"
        >
          {opening ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…</> : <><ScanLine className="mr-2 h-4 w-4" /> Start Receiving</>}
        </Button>
      </div>
    )
  }

  // Session completed — show summary
  if (sessionStatus === "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Session completed</p>
            {summary && (
              <p className="text-xs text-emerald-600 mt-0.5">
                {summary.postedScans} of {summary.totalScans} scans posted · {summary.exceptionCount} open exception{summary.exceptionCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {scans.length > 0 && <ScanList scans={scans} />}
        <ExceptionsPanel exceptions={exceptions} tenantId={tenantId} onResolved={loadExceptions} />
      </div>
    )
  }

  // Active session
  return (
    <div className="space-y-4">
      {/* Session status bar */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-700 dark:border-slate-600">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Session active &nbsp;·&nbsp;
          <span className="font-medium text-emerald-700">{postedCount} posted</span>
          {exceptionCount > 0 && <span className="text-red-500 ml-1">&nbsp;·&nbsp;{exceptionCount} exception{exceptionCount !== 1 ? "s" : ""}</span>}
        </div>
        <Button
          variant="outline"
          className="text-xs h-7 px-3"
          onClick={finalize}
          disabled={finalizing}
        >
          {finalizing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Finalize"}
        </Button>
      </div>

      {/* Mode toggle + scan input */}
      <div className="space-y-2">
        {/* Segmented mode toggle */}
        <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => { setEntryMode("barcode"); setInputValue(""); setLastResult(null) }}
            className={`px-3 py-1.5 transition-colors ${
              entryMode === "barcode"
                ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            }`}
          >
            Scan Barcode
          </button>
          <button
            type="button"
            onClick={() => { setEntryMode("sku"); setInputValue(""); setLastResult(null) }}
            className={`px-3 py-1.5 border-l border-slate-200 dark:border-slate-600 transition-colors ${
              entryMode === "sku"
                ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            }`}
          >
            Manual SKU
          </button>
        </div>

        {/* Input row */}
        <form onSubmit={submitScan} className="flex gap-2">
          <input
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-100"
            placeholder={entryMode === "barcode" ? "Scan barcode…" : "Enter SKU…"}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setLastResult(null) }}
            autoFocus
          />
          <input
            type="number"
            min={1}
            className="w-16 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-100"
            value={scannedQty}
            onChange={e => setScannedQty(Math.max(1, Number(e.target.value)))}
            title="Qty"
          />
          <Button type="submit" disabled={scanning || !inputValue.trim()} className="bg-slate-900 hover:bg-slate-800 text-white px-3">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {/* Inline result feedback */}
        {lastResult && !scanError && (() => {
          const { outcome, exceptionCode, sku, entryMode: mode } = lastResult
          if (outcome === "sku_not_found") {
            return (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                SKU not found
              </p>
            )
          }
          if (outcome === "exception" && exceptionCode === "unknown_barcode") {
            return (
              <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                <p className="font-medium">Unknown barcode</p>
                <p className="text-slate-500 dark:text-slate-400">Save and map this barcode to a product in the Exceptions panel below</p>
              </div>
            )
          }
          if (outcome === "posted" || outcome === "matched") {
            return (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 space-y-0.5">
                {sku && <p className="font-medium font-mono">{sku}</p>}
                <p className="text-slate-500 dark:text-slate-400">
                  {mode === "barcode" ? `Barcode matched · each · qty ${lastResult.inputValue ? scannedQty : 1}` : `Manual SKU match · ${sku}`}
                </p>
              </div>
            )
          }
          if (outcome === "exception") {
            return (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {exceptionCode?.replace(/_/g, " ") ?? "Exception raised"} — see panel below
              </p>
            )
          }
          return null
        })()}
      </div>

      {scanError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />{scanError}
        </p>
      )}

      {/* Scan results */}
      {scans.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-6">
          {entryMode === "barcode" ? "No scans yet — scan a barcode above" : "No scans yet — enter a SKU above"}
        </p>
      ) : (
        <ScanList scans={scans} />
      )}

      {/* Exceptions panel */}
      <ExceptionsPanel
        exceptions={exceptions}
        tenantId={tenantId}
        onResolved={loadExceptions}
      />
    </div>
  )
}

// ─── Putaway Tab ──────────────────────────────────────────────────────────────

interface PutawayTaskUI {
  id: string
  status: "pending" | "in_progress" | "completed"
  sku: string | null
  qty: number
  sourceLocation: string | null
  destinationLocation: string | null
  completedAt: string | null
}

function putawayStatusBadge(status: PutawayTaskUI["status"]) {
  if (status === "completed")
    return <Badge className="bg-emerald-500 text-white text-xs">Done</Badge>
  if (status === "in_progress")
    return <Badge className="bg-blue-500 text-white text-xs">In Progress</Badge>
  return <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">Pending</Badge>
}

function PutawayTab({
  shipment,
  tenantId,
  storageLocations,
}: {
  shipment: InboundShipment
  tenantId: string
  storageLocations: string[]
}) {
  const [tasks, setTasks] = React.useState<PutawayTaskUI[]>([])
  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Per-task destination overrides and confirming state
  const [destOverrides, setDestOverrides] = React.useState<Record<string, string>>({})
  const [confirming, setConfirming] = React.useState<string | null>(null)
  const [confirmError, setConfirmError] = React.useState<Record<string, string>>({})

  const loadTasks = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/inbound/${shipment.id}/putaway?tenantId=${tenantId}`
      )
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      const rows: PutawayTaskUI[] = (data.status?.tasks ?? []).map(
        (t: Record<string, unknown>) => ({
          id: t.id as string,
          status: t.status as PutawayTaskUI["status"],
          sku: (t.sku as string | null) ?? null,
          qty: (t.qty as number) ?? 0,
          sourceLocation: (t.sourceLocation as string | null) ?? null,
          destinationLocation: (t.destinationLocation as string | null) ?? null,
          completedAt: (t.completedAt as string | null) ?? null,
        })
      )
      setTasks(rows)
    } catch {
      setError("Failed to load putaway tasks.")
    } finally {
      setLoading(false)
    }
  }, [shipment.id, tenantId])

  React.useEffect(() => { loadTasks() }, [loadTasks])

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/inbound/${shipment.id}/putaway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate")
      await loadTasks()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setGenerating(false)
    }
  }

  const confirmTask = async (taskId: string) => {
    const dest = destOverrides[taskId] ?? tasks.find(t => t.id === taskId)?.destinationLocation ?? ""
    if (!dest.trim()) {
      setConfirmError(prev => ({ ...prev, [taskId]: "Select or enter a destination location." }))
      return
    }
    setConfirming(taskId)
    setConfirmError(prev => ({ ...prev, [taskId]: "" }))
    try {
      const res = await fetch(`/api/tasks/${taskId}/putaway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, destinationLocation: dest.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm")
      await loadTasks()
    } catch (err: unknown) {
      setConfirmError(prev => ({
        ...prev,
        [taskId]: err instanceof Error ? err.message : "Unknown error",
      }))
    } finally {
      setConfirming(null)
    }
  }

  const pending = tasks.filter(t => t.status !== "completed").length
  const done = tasks.filter(t => t.status === "completed").length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{tasks.length}</span> putaway task{tasks.length !== 1 ? "s" : ""}
            {done > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">{done} completed</span>
            )}
            {pending > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">{pending} remaining</span>
            )}
          </span>
          {done === tasks.length && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}

      {/* No tasks yet */}
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-4">
          <MoveRight className="h-10 w-10 text-slate-200 dark:text-slate-600" />
          <div className="text-center">
            <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">No putaway tasks yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Finalize a receiving session first, then generate putaway work.
            </p>
          </div>
          <Button
            onClick={generate}
            disabled={generating}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {generating
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
              : <><MoveRight className="mr-2 h-4 w-4" /> Generate Putaway Tasks</>
            }
          </Button>
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map(task => {
            const isConfirming = confirming === task.id
            const taskDest = destOverrides[task.id] ?? task.destinationLocation ?? ""
            const taskErr = confirmError[task.id]
            const isDone = task.status === "completed"

            return (
              <div
                key={task.id}
                className={`rounded-lg border p-4 space-y-3 ${
                  isDone
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                }`}
              >
                {/* Task header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {putawayStatusBadge(task.status)}
                    {task.sku && (
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {task.sku}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {task.qty} unit{task.qty !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isDone && task.completedAt && (
                    <span className="text-xs text-slate-400">
                      {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {/* Location flow */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                    {task.sourceLocation ?? "STAGING"}
                  </span>
                  <MoveRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {isDone ? (
                    <span className="font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
                      {task.destinationLocation ?? "—"}
                    </span>
                  ) : (
                    /* Destination selector */
                    <div className="flex-1 min-w-[140px]">
                      {storageLocations.length > 0 ? (
                        <select
                          className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          value={taskDest}
                          onChange={e =>
                            setDestOverrides(prev => ({ ...prev, [task.id]: e.target.value }))
                          }
                        >
                          <option value="">Select destination…</option>
                          {task.destinationLocation && (
                            <option value={task.destinationLocation}>
                              {task.destinationLocation} (suggested)
                            </option>
                          )}
                          {storageLocations
                            .filter(l => l !== task.destinationLocation)
                            .map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                      ) : (
                        <input
                          className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                          placeholder={task.destinationLocation ?? "Enter location code…"}
                          value={taskDest}
                          onChange={e =>
                            setDestOverrides(prev => ({ ...prev, [task.id]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                  )}
                </div>

                {taskErr && (
                  <p className="text-xs text-red-500">{taskErr}</p>
                )}

                {!isDone && (
                  <Button
                    onClick={() => confirmTask(task.id)}
                    disabled={isConfirming || !taskDest.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                  >
                    {isConfirming
                      ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Confirming…</>
                      : <><CheckCircle2 className="h-3 w-3 mr-1.5" /> Confirm Putaway</>
                    }
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Re-generate button (if tasks exist but more scans were added) */}
      {tasks.length > 0 && (
        <Button
          variant="outline"
          className="w-full text-xs h-8"
          onClick={generate}
          disabled={generating}
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
          Re-generate from latest session
        </Button>
      )}
    </div>
  )
}

function ScanList({ scans }: { scans: ScanRecord[] }) {
  return (
    <div className="space-y-1.5">
      {scans.map(scan => (
        <div
          key={scan.scanId}
          className={`flex items-start justify-between p-2.5 rounded-lg border text-xs ${
            scan.outcome === "posted"    ? "border-emerald-200 bg-emerald-50"
            : scan.outcome === "matched" ? "border-blue-200 bg-blue-50"
            : scan.outcome === "exception" ? "border-red-200 bg-red-50"
            : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-600">{scan.inputValue}</span>
              {scan.entryMode === "sku" && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">SKU</span>
              )}
              {outcomeBadge(scan.outcome, scan.exceptionCode)}
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              {scan.sku && <span>SKU: <span className="font-medium">{scan.sku}</span></span>}
              <span>Qty: {scan.scannedQty}{scan.resolvedBaseQty !== null && scan.resolvedBaseQty !== scan.scannedQty ? ` → ${scan.resolvedBaseQty} base` : ""}</span>
              {scan.expectedQty !== null && <span>Expected: {scan.expectedQty}</span>}
            </div>
            {scan.movementId && <span className="font-mono text-emerald-600">{scan.movementId}</span>}
          </div>
          <RefreshCw className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
        </div>
      ))}
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
  const [storageLocationCodes, setStorageLocationCodes] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [palletsLoading, setPalletsLoading] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [showNewForm, setShowNewForm] = React.useState(false)

  // Derived counts: loaded in the background after initial page load
  const [derivedCounts, setDerivedCounts] = React.useState<Record<string, ShipmentCounts>>({})

  // Filter state
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterClient, setFilterClient] = React.useState("all")
  const [filterSearch, setFilterSearch] = React.useState("")

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

      // Background: load storage location codes for putaway destination picker
      ;(async () => {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          if (supabaseUrl && anonKey) {
            const res = await fetch(
              `${supabaseUrl}/rest/v1/storage_locations?select=code&tenant_id=eq.${selectedTenant.id}&order=code.asc`,
              { headers: { apikey: anonKey } }
            )
            if (res.ok) {
              const rows = await res.json()
              setStorageLocationCodes(
                Array.isArray(rows) ? rows.map((r: { code: string }) => r.code).filter(Boolean) : []
              )
            }
          }
        } catch {
          // non-fatal: destination picker falls back to free-text input
        }
      })()

      // Background: compute derived counts for all shipments sequentially
      // (non-blocking — table cells update as each completes)
      ;(async () => {
        for (const ship of s) {
          try {
            const counts = await computeShipmentCounts(ship.id, api)
            setDerivedCounts(prev => ({ ...prev, [ship.id]: counts }))
          } catch {
            // non-fatal: cell stays "—"
          }
        }
      })()
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

  const closePanel = () => setSelected(null)

  const handleConfirm = async () => {
    if (!selected) return
    setConfirming(true)
    try {
      const priority = getPriority(selected.arrivalDate, selected.arrivalWindowStart)
      const scheduledDate = new Date().toISOString().slice(0, 10)

      // 1 Receive task for the shipment
      await api.tasks.createTask({
        tenantId: selected.tenantId,
        type: "Receive",
        status: "pending",
        assignee: "Unassigned",
        location: `Rec Dock • Door ${selected.dockDoor}`,
        items: selected.totalPallets,
        priority,
        scheduledDate,
        estimatedPackages: selected.totalPallets,
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
          scheduledDate,
          estimatedPackages: 1,
          zone: pallet.assignedZoneId ?? null,
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

  // Filtered shipments (local, in-memory)
  const filteredShipments = React.useMemo(() => {
    return shipments.filter(s => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false
      if (filterClient !== "all" && s.clientId !== filterClient) return false
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase()
        const clientName = (clientNameMap[s.clientId] ?? s.clientId).toLowerCase()
        if (!s.referenceNumber.toLowerCase().includes(q) && !clientName.includes(q)) return false
      }
      return true
    })
  }, [shipments, filterStatus, filterClient, filterSearch, clientNameMap])

  const filtersActive = filterStatus !== "all" || filterClient !== "all" || filterSearch.trim() !== ""

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

      {/* Inbound queue table */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">

        {/* Filter bar */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white dark:bg-slate-700 dark:text-slate-100 placeholder:text-slate-400"
              placeholder="Search reference or client…"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            className="text-xs border border-slate-200 dark:border-slate-600 rounded-md px-2.5 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="arrived">Arrived</option>
            <option value="receiving">In Progress</option>
            <option value="putaway">Putaway</option>
            <option value="complete">Complete</option>
          </select>

          {/* Client filter */}
          <select
            className="text-xs border border-slate-200 dark:border-slate-600 rounded-md px-2.5 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
          >
            <option value="all">All clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Clear filters */}
          {filtersActive && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterClient("all"); setFilterSearch("") }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          {/* Result count */}
          <span className="ml-auto text-xs text-slate-400 tabular-nums shrink-0">
            {filteredShipments.length}{filtersActive ? ` of ${shipments.length}` : ""} shipment{filteredShipments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {filteredShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <ArrowDownToLine className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{shipments.length === 0 ? "No inbound shipments" : "No shipments match the current filters"}</p>
            {shipments.length === 0 && <p className="text-xs mt-1 text-slate-300">Click &ldquo;New Inbound&rdquo; to create one</p>}
            {filtersActive && (
              <button
                onClick={() => { setFilterStatus("all"); setFilterClient("all"); setFilterSearch("") }}
                className="mt-3 text-xs text-slate-500 underline hover:text-slate-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reference</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Client</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Pallets</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Boxes</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">SKUs</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Arrival</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Carrier</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Door</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredShipments.map(s => {
                const priority = getPriority(s.arrivalDate, s.arrivalWindowStart)
                const isSelected = selected?.id === s.id
                const counts = derivedCounts[s.id]
                const dimText = isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
                const numText = isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"
                const dash = <span className={`${dimText} italic text-xs`}>—</span>
                return (
                  <tr
                    key={s.id}
                    onClick={() => selectShipment(s)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-slate-900 dark:bg-slate-700"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`font-mono text-xs ${dimText}`}>{s.referenceNumber}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-medium text-sm ${numText}`}>
                        {clientNameMap[s.clientId] ?? s.clientId}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{getStatusBadge(s.status)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-medium tabular-nums text-sm ${numText}`}>{s.totalPallets}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {counts
                        ? <span className={`tabular-nums text-sm font-medium ${numText}`}>{counts.boxes}</span>
                        : dash}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {counts
                        ? <span className={`tabular-nums text-sm font-medium ${numText}`}>{counts.skus}</span>
                        : dash}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${dimText}`}>
                        <Clock className="h-3 w-3 shrink-0" />
                        {s.arrivalDate}
                        <span className="opacity-40">·</span>
                        {s.arrivalWindowStart}–{s.arrivalWindowEnd}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs truncate max-w-[100px] block ${dimText}`}>
                        {s.carrier || dash}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {s.dockDoor
                        ? <span className={`text-xs font-medium ${isSelected ? "text-slate-200" : "text-slate-700 dark:text-slate-300"}`}>Door {s.dockDoor}</span>
                        : dash}
                    </td>
                    <td className="px-3 py-2.5">
                      {priority === "urgent"
                        ? <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
                        : priority === "high"
                        ? <Badge className="bg-amber-500 text-white text-xs">High</Badge>
                        : <Badge variant="outline" className="text-xs">Normal</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over detail panel */}
      {selected && (() => {
        const counts = derivedCounts[selected.id]
        const priority = getPriority(selected.arrivalDate, selected.arrivalWindowStart)
        return (
          <div className="fixed inset-0 z-50 flex" aria-modal="true">
            {/* Backdrop */}
            <div className="flex-1 bg-black/25" onClick={closePanel} />

            {/* Panel */}
            <div className="w-[min(960px,78vw)] bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-700">

              {/* Panel header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {getStatusBadge(selected.status)}
                      <span className="text-xs text-slate-400 font-mono">{selected.referenceNumber}</span>
                      {priority === "urgent" && <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>}
                      {priority === "high" && <Badge className="bg-amber-500 text-white text-xs">High</Badge>}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {clientNameMap[selected.clientId] ?? selected.clientId}
                    </h3>
                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {selected.arrivalDate} · {selected.arrivalWindowStart} – {selected.arrivalWindowEnd}
                      </span>
                      {selected.dockDoor && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3 shrink-0" />
                          Door {selected.dockDoor}
                        </span>
                      )}
                      {selected.carrier && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3 shrink-0" />
                          {selected.carrier}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={closePanel}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                    aria-label="Close panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Metric grid */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    { label: "Pallets", value: selected.totalPallets, ready: true },
                    { label: "Boxes",   value: counts?.boxes,  ready: counts !== undefined },
                    { label: "SKUs",    value: counts?.skus,   ready: counts !== undefined },
                    { label: "Units",   value: counts?.units,  ready: counts !== undefined },
                  ].map(({ label, value, ready }) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                        {ready
                          ? (value ?? 0)
                          : <span className="text-slate-300 dark:text-slate-500 text-sm font-medium">—</span>
                        }
                      </p>
                    </div>
                  ))}
                </div>

                {selected.notes && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded px-3 py-1.5 italic">
                    {selected.notes}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0 px-2">
                {(["overview", "pallets", "locations", "receiving", "putaway"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      detailTab === tab
                        ? "border-slate-900 text-slate-900 dark:border-slate-300 dark:text-slate-100"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab content — scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Overview tab */}
                {detailTab === "overview" && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Carrier</p>
                        <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                          {selected.carrier || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Arrival Window</p>
                        <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                          {selected.arrivalDate} · {selected.arrivalWindowStart} – {selected.arrivalWindowEnd}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Dock Door</p>
                        <p className="text-sm text-slate-900 dark:text-slate-100">Door {selected.dockDoor || "—"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Pallets</p>
                        <p className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-slate-400 shrink-0" />
                          {selected.totalPallets}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Priority</p>
                        {priority === "urgent"
                          ? <Badge className="bg-red-500">Urgent</Badge>
                          : priority === "high"
                          ? <Badge className="bg-amber-500">High</Badge>
                          : <Badge variant="outline">Normal</Badge>}
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

                {/* Receiving tab */}
                {detailTab === "receiving" && (
                  <ReceivingTab shipment={selected} tenantId={selectedTenant.id} />
                )}

                {/* Putaway tab */}
                {detailTab === "putaway" && (
                  <PutawayTab
                    shipment={selected}
                    tenantId={selectedTenant.id}
                    storageLocations={storageLocationCodes}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
