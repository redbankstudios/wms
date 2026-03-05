"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Users, Truck, MapPin, Plus, Pencil, Trash2, CircleDot,
} from "lucide-react"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import type { Driver, DeliveryZone, Vehicle } from "@/types"
import dynamic from "next/dynamic"

const DriversZonesMap = dynamic(() => import("./drivers-zones-map"), { ssr: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(s: Driver["status"]): "default" | "secondary" | "outline" | "destructive" {
  if (s === "active") return "default"
  if (s === "off_duty") return "secondary"
  return "outline"
}

function statusLabel(s: Driver["status"]) {
  return s === "off_duty" ? "Off Duty" : s === "on_leave" ? "On Leave" : "Active"
}

function capacityColor(pct: number) {
  if (pct >= 90) return "text-red-600"
  if (pct >= 70) return "text-amber-600"
  return "text-emerald-600"
}

// ─── Driver Form Modal ────────────────────────────────────────────────────────

interface DriverFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Driver, "id" | "tenantId">) => void
  initial?: Driver
  vehicles: Vehicle[]
  zones: DeliveryZone[]
}

function DriverFormModal({ open, onClose, onSave, initial, vehicles, zones }: DriverFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "")
  const [email, setEmail] = React.useState(initial?.email ?? "")
  const [phone, setPhone] = React.useState(initial?.phone ?? "")
  const [vehicleId, setVehicleId] = React.useState(initial?.vehicleId ?? "none")
  const [zoneId, setZoneId] = React.useState(initial?.zoneId ?? "none")
  const [maxStops, setMaxStops] = React.useState(String(initial?.maxStops ?? 15))
  const [status, setStatus] = React.useState<Driver["status"]>(initial?.status ?? "active")

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setEmail(initial?.email ?? "")
      setPhone(initial?.phone ?? "")
      setVehicleId(initial?.vehicleId ?? "none")
      setZoneId(initial?.zoneId ?? "none")
      setMaxStops(String(initial?.maxStops ?? 15))
      setStatus(initial?.status ?? "active")
    }
  }, [open, initial])

  function handleSave() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      vehicleId: vehicleId === "none" ? undefined : vehicleId,
      zoneId: zoneId === "none" ? undefined : zoneId,
      maxStops: Math.max(1, parseInt(maxStops) || 15),
      status,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Driver" : "Add Driver"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="driver@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.id} — {v.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Zone</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {zones.map(z => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Max Stops / Day</Label>
              <Input type="number" min={1} max={50} value={maxStops} onChange={e => setMaxStops(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as Driver["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Zone Form Modal ──────────────────────────────────────────────────────────

interface ZoneFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<DeliveryZone, "id" | "tenantId">) => void
  initial?: DeliveryZone
  prefillLat?: number
  prefillLng?: number
}

const ZONE_COLORS = [
  { label: "Red",    value: "#ef4444" },
  { label: "Blue",   value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Green",  value: "#10b981" },
  { label: "Orange", value: "#f97316" },
  { label: "Teal",   value: "#14b8a6" },
]

function ZoneFormModal({ open, onClose, onSave, initial, prefillLat, prefillLng }: ZoneFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "")
  const [description, setDescription] = React.useState(initial?.description ?? "")
  const [centerLat, setCenterLat] = React.useState(String(initial?.centerLat ?? ""))
  const [centerLng, setCenterLng] = React.useState(String(initial?.centerLng ?? ""))
  const [radiusKm, setRadiusKm] = React.useState(String(initial?.radiusKm ?? 15))
  const [color, setColor] = React.useState(initial?.color ?? "#3b82f6")

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setDescription(initial?.description ?? "")
      setCenterLat(String(initial?.centerLat ?? prefillLat ?? ""))
      setCenterLng(String(initial?.centerLng ?? prefillLng ?? ""))
      setRadiusKm(String(initial?.radiusKm ?? 15))
      setColor(initial?.color ?? "#3b82f6")
    }
  }, [open, initial, prefillLat, prefillLng])

  function handleSave() {
    if (!name.trim() || !centerLat || !centerLng) return
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      centerLat: parseFloat(centerLat),
      centerLng: parseFloat(centerLng),
      radiusKm: Math.max(1, parseFloat(radiusKm) || 15),
      color,
    })
    onClose()
  }

  const valid = name.trim() && centerLat && centerLng && !isNaN(parseFloat(centerLat)) && !isNaN(parseFloat(centerLng))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Zone" : "Add Zone"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Zone Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Downtown Zone" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Coverage area notes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Center Latitude *</Label>
              <Input value={centerLat} onChange={e => setCenterLat(e.target.value)} placeholder="37.3382" />
            </div>
            <div className="space-y-1">
              <Label>Center Longitude *</Label>
              <Input value={centerLng} onChange={e => setCenterLng(e.target.value)} placeholder="-121.8863" />
            </div>
          </div>
          {(prefillLat || prefillLng) && !initial && (
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 -mt-1">
              <MapPin className="h-3 w-3 flex-none" />
              Center coordinates picked from map — adjust if needed
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Radius (km)</Label>
              <Input type="number" min={1} max={100} value={radiusKm} onChange={e => setRadiusKm(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {ZONE_COLORS.map(c => (
                  <button
                    key={c.value}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c.value ? "border-slate-700 scale-110" : "border-transparent"}`}
                    style={{ background: c.value }}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!valid}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Drivers Tab ──────────────────────────────────────────────────────────────

function DriversTab({
  drivers, vehicles, zones, onEdit, onDelete,
}: {
  drivers: Driver[]
  vehicles: Vehicle[]
  zones: DeliveryZone[]
  onEdit: (d: Driver) => void
  onDelete: (id: string) => void
}) {
  const zoneMap = React.useMemo(
    () => Object.fromEntries(zones.map(z => [z.id, z])),
    [zones]
  )
  const vehicleMap = React.useMemo(
    () => Object.fromEntries(vehicles.map(v => [v.id, v])),
    [vehicles]
  )

  const activeCount = drivers.filter(d => d.status === "active").length
  const offDutyCount = drivers.filter(d => d.status === "off_duty").length
  const totalMaxWeight = vehicles.reduce((sum, v) => sum + (v.maxWeightKg ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Drivers", value: drivers.length, icon: Users },
          { label: "Active", value: activeCount, icon: Users },
          { label: "Off Duty", value: offDutyCount, icon: Users },
          { label: "Fleet Capacity (kg)", value: totalMaxWeight.toLocaleString(), icon: Truck },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              <s.icon className="h-4 w-4 text-slate-400 flex-none" />
              <div>
                <p className="text-[11px] text-slate-500">{s.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Driver cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map(driver => {
          const zone = driver.zoneId ? zoneMap[driver.zoneId] : null
          const vehicle = driver.vehicleId ? vehicleMap[driver.vehicleId] : null
          return (
            <Card key={driver.id} className="hover:border-slate-300 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">{driver.name}</CardTitle>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{driver.id}</p>
                  </div>
                  <Badge variant={statusVariant(driver.status)} className="text-[10px]">
                    {statusLabel(driver.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2.5">
                {/* Zone badge */}
                {zone ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: zone.color }} />
                    <span className="font-medium">{zone.name}</span>
                    <span className="text-slate-400">· r={zone.radiusKm}km</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No zone assigned</p>
                )}

                {/* Vehicle chip */}
                {vehicle ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1">
                    <Truck className="h-3 w-3 flex-none text-slate-400" />
                    <span className="font-mono">{vehicle.id}</span>
                    <span className="text-slate-400">·</span>
                    <span>{vehicle.type}</span>
                    <span className="ml-auto text-slate-400">{vehicle.maxWeightKg}kg / {vehicle.maxPackages}pkg</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1">
                    <Truck className="h-3 w-3 flex-none" />
                    No vehicle assigned
                  </div>
                )}

                {/* Max stops + contact */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Max {driver.maxStops} stops/day</span>
                  {driver.phone && <span>{driver.phone}</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => onEdit(driver)}>
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(driver.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Zones Tab ────────────────────────────────────────────────────────────────

function ZonesTab({
  zones,
  drivers,
  onEdit,
  onDelete,
  selectedZoneId,
  onZoneSelect,
  onMapClick,
}: {
  zones: DeliveryZone[]
  drivers: Driver[]
  onEdit: (z: DeliveryZone) => void
  onDelete: (id: string) => void
  selectedZoneId: string | null
  onZoneSelect: (id: string | null) => void
  onMapClick: (lat: number, lng: number) => void
}) {
  const driversByZone = React.useMemo(() => {
    const map: Record<string, number> = {}
    drivers.forEach(d => { if (d.zoneId) map[d.zoneId] = (map[d.zoneId] ?? 0) + 1 })
    return map
  }, [drivers])

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
      {/* Sidebar — zone list */}
      <div className="w-72 flex-none flex flex-col gap-3 overflow-y-auto pr-1">
        {zones.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm text-center gap-2">
            <MapPin className="h-8 w-8 opacity-30" />
            <span>No delivery zones yet.<br />Click the map to add one.</span>
          </div>
        )}
        {zones.map(zone => {
          const count = driversByZone[zone.id] ?? 0
          const isSelected = selectedZoneId === zone.id
          return (
            <Card
              key={zone.id}
              className="cursor-pointer transition-all hover:shadow-sm"
              style={isSelected ? { outline: `2px solid ${zone.color}`, outlineOffset: 2 } : {}}
              onClick={() => onZoneSelect(isSelected ? null : zone.id)}
            >
              <CardContent className="p-3 space-y-2.5">
                {/* Header */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex-none flex items-center justify-center"
                    style={{ background: zone.color + "22", border: `2px solid ${zone.color}` }}
                  >
                    <CircleDot className="h-3.5 w-3.5" style={{ color: zone.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{zone.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{zone.id}</p>
                  </div>
                </div>

                {zone.description && (
                  <p className="text-xs text-slate-500 truncate">{zone.description}</p>
                )}

                {/* Stats */}
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1">
                    <p className="text-slate-400 text-[10px]">Radius</p>
                    <p className="font-medium">{zone.radiusKm} km</p>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1">
                    <p className="text-slate-400 text-[10px]">Drivers</p>
                    <p className="font-medium">{count} assigned</p>
                  </div>
                </div>

                {/* Coords */}
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <MapPin className="h-2.5 w-2.5 flex-none" />
                  <span className="font-mono">{zone.centerLat.toFixed(4)}, {zone.centerLng.toFixed(4)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={e => { e.stopPropagation(); onEdit(zone) }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={e => { e.stopPropagation(); onDelete(zone.id) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <DriversZonesMap
          zones={zones}
          selectedZoneId={selectedZoneId}
          onMapClick={onMapClick}
          onZoneClick={id => onZoneSelect(selectedZoneId === id ? null : id)}
          onZoneEdit={onEdit}
        />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function DriversManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [zones, setZones] = React.useState<DeliveryZone[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])

  // Driver modal state
  const [driverModal, setDriverModal] = React.useState<{ open: boolean; editing?: Driver }>({ open: false })
  // Zone modal state
  const [zoneModal, setZoneModal] = React.useState<{ open: boolean; editing?: DeliveryZone }>({ open: false })
  // Zone map state
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null)
  const [mapClickCoords, setMapClickCoords] = React.useState<{ lat: number; lng: number } | null>(null)

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
      const [driverData, zoneData, vehicleData] = await Promise.all([
        api.drivers.getDriversByTenant(tenantId!),
        api.zones.getZonesByTenant(tenantId!),
        api.vehicles.getVehiclesByTenant(tenantId!),
      ])
      setDrivers(driverData)
      setZones(zoneData)
      setVehicles(vehicleData)
    }
    load()
  }, [api, tenantId])

  // ── Driver CRUD ────────────────────────────────────────────────────────────
  async function saveDriver(data: Omit<Driver, "id" | "tenantId">) {
    if (!tenantId) return
    if (driverModal.editing) {
      const updated = await api.drivers.updateDriver(driverModal.editing.id, data)
      setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d))
    } else {
      const created = await api.drivers.createDriver({ ...data, tenantId })
      setDrivers(prev => [...prev, created])
    }
  }

  async function deleteDriver(id: string) {
    if (!confirm("Delete this driver?")) return
    await api.drivers.deleteDriver(id)
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  // ── Zone map interactions ──────────────────────────────────────────────────
  function handleMapClick(lat: number, lng: number) {
    setMapClickCoords({ lat, lng })
    setZoneModal({ open: true })
  }

  // ── Zone CRUD ──────────────────────────────────────────────────────────────
  async function saveZone(data: Omit<DeliveryZone, "id" | "tenantId">) {
    if (!tenantId) return
    if (zoneModal.editing) {
      const updated = await api.zones.updateZone(zoneModal.editing.id, data)
      setZones(prev => prev.map(z => z.id === updated.id ? updated : z))
    } else {
      const created = await api.zones.createZone({ ...data, tenantId })
      setZones(prev => [...prev, created])
    }
  }

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone? Drivers assigned to this zone will be unaffected.")) return
    await api.zones.deleteZone(id)
    setZones(prev => prev.filter(z => z.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Drivers</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{drivers.length} drivers · {zones.length} delivery zones</p>
        </div>
      </div>

      <Tabs defaultValue="drivers">
        <div className="flex items-center justify-between mb-3">
          <TabsList>
            <TabsTrigger value="drivers">
              <Users className="h-3.5 w-3.5 mr-1.5" />Drivers
            </TabsTrigger>
            <TabsTrigger value="zones">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />Delivery Zones
            </TabsTrigger>
          </TabsList>
          <Tabs value="drivers">
            <TabsContent value="drivers" asChild>
              <span />
            </TabsContent>
          </Tabs>
          {/* Contextual add button — always shown, tabs decide what it does */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setMapClickCoords(null); setZoneModal({ open: true }) }}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Zone
            </Button>
            <Button size="sm" onClick={() => setDriverModal({ open: true })}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Driver
            </Button>
          </div>
        </div>

        <TabsContent value="drivers">
          <DriversTab
            drivers={drivers}
            vehicles={vehicles}
            zones={zones}
            onEdit={d => setDriverModal({ open: true, editing: d })}
            onDelete={deleteDriver}
          />
        </TabsContent>

        <TabsContent value="zones">
          <ZonesTab
            zones={zones}
            drivers={drivers}
            onEdit={z => { setMapClickCoords(null); setZoneModal({ open: true, editing: z }) }}
            onDelete={deleteZone}
            selectedZoneId={selectedZoneId}
            onZoneSelect={setSelectedZoneId}
            onMapClick={handleMapClick}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <DriverFormModal
        open={driverModal.open}
        onClose={() => setDriverModal({ open: false })}
        onSave={saveDriver}
        initial={driverModal.editing}
        vehicles={vehicles}
        zones={zones}
      />
      <ZoneFormModal
        open={zoneModal.open}
        onClose={() => { setZoneModal({ open: false }); setMapClickCoords(null) }}
        onSave={saveZone}
        initial={zoneModal.editing}
        prefillLat={mapClickCoords?.lat}
        prefillLng={mapClickCoords?.lng}
      />
    </div>
  )
}
