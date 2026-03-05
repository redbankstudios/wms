"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Search, Plus, Truck, Wrench, MapPin, User, Loader2,
  Pencil, Trash2, AlertCircle, AlertTriangle, CheckCircle2,
} from "lucide-react"
import { Driver, Location, Vehicle } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

const VEHICLE_TYPES = ["Cargo Van", "Box Truck (16')", "Box Truck (24')"]

function isOverdue(nextService: string): boolean {
  if (!nextService || nextService === "TBD") return false
  const d = new Date(nextService)
  return !isNaN(d.getTime()) && new Date() > d
}

function isServiceSoon(nextService: string): boolean {
  if (!nextService || nextService === "TBD") return false
  const d = new Date(nextService)
  if (isNaN(d.getTime())) return false
  const diff = d.getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

const EMPTY_FORM = {
  type: "Cargo Van",
  plate: "",
  status: "good" as Vehicle["status"],
  driver: "Unassigned",
  location: "Warehouse Yard",
  lastService: "",
  nextService: "",
  maxWeightKg: 1000,
  maxPackages: 150,
}

type FormState = typeof EMPTY_FORM
type StatusFilter = "all" | Vehicle["status"]

const SELECT_CLS = "mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"

function VehicleForm({
  form,
  setForm,
  drivers,
  locations,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  drivers: Driver[]
  locations: Location[]
}) {
  return (
    <div className="grid gap-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vtype">Vehicle Type</Label>
          <select
            id="vtype"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className={SELECT_CLS}
          >
            {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="vplate">License Plate</Label>
          <Input
            id="vplate"
            value={form.plate}
            onChange={e => setForm(f => ({ ...f, plate: e.target.value }))}
            placeholder="CA-00000"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vstatus">Status</Label>
          <select
            id="vstatus"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as Vehicle["status"] }))}
            className={SELECT_CLS}
          >
            <option value="good">Good</option>
            <option value="needs_service">Needs Service</option>
            <option value="in_repair">In Repair</option>
          </select>
        </div>
        <div>
          <Label htmlFor="vdriver">Assigned Driver</Label>
          <select
            id="vdriver"
            value={form.driver}
            onChange={e => setForm(f => ({ ...f, driver: e.target.value }))}
            className={SELECT_CLS}
          >
            <option value="Unassigned">— Unassigned —</option>
            {drivers.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="vlocation">Current Location</Label>
        <input
          id="vlocation"
          list="vlocation-list"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          placeholder="Warehouse Yard"
          className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <datalist id="vlocation-list">
          {locations.map(l => (
            <option key={l.id} value={l.name}>{l.name} — {l.address}</option>
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vlastService">Last Service Date</Label>
          <Input
            id="vlastService"
            value={form.lastService}
            onChange={e => setForm(f => ({ ...f, lastService: e.target.value }))}
            placeholder="Oct 01, 2023"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vnextService">Next Service Date</Label>
          <Input
            id="vnextService"
            value={form.nextService}
            onChange={e => setForm(f => ({ ...f, nextService: e.target.value }))}
            placeholder="Apr 01, 2024"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vmaxWeight">Max Weight (kg)</Label>
          <Input
            id="vmaxWeight"
            type="number"
            value={form.maxWeightKg}
            onChange={e => setForm(f => ({ ...f, maxWeightKg: Number(e.target.value) }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vmaxPkgs">Max Packages</Label>
          <Input
            id="vmaxPkgs"
            type="number"
            value={form.maxPackages}
            onChange={e => setForm(f => ({ ...f, maxPackages: Number(e.target.value) }))}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}

export function FleetManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [locations, setLocations] = React.useState<Location[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")

  // Add modal
  const [showAdd, setShowAdd] = React.useState(false)
  const [form, setForm] = React.useState<FormState>({ ...EMPTY_FORM })
  const [saving, setSaving] = React.useState(false)

  // Edit modal
  const [editVehicle, setEditVehicle] = React.useState<Vehicle | null>(null)
  const [editForm, setEditForm] = React.useState<FormState>({ ...EMPTY_FORM })

  // Delete confirm
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [data, driverData, locationData] = await Promise.all([
        api.vehicles.getVehiclesByTenant(selectedTenant.id),
        api.drivers.getDriversByTenant(selectedTenant.id),
        api.locations.getLocationsByTenant(selectedTenant.id),
      ])
      setVehicles(data)
      setDrivers(driverData)
      setLocations(locationData)
      setLoading(false)
    }
    loadData()
  }, [api, selectedTenant.id])

  const kpis = React.useMemo(() => ({
    total: vehicles.length,
    onRoute: vehicles.filter(v => v.driver !== "Unassigned" && v.status === "good").length,
    available: vehicles.filter(v => v.driver === "Unassigned" && v.status === "good").length,
    needsService: vehicles.filter(v => v.status === "needs_service").length,
    inRepair: vehicles.filter(v => v.status === "in_repair").length,
  }), [vehicles])

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return vehicles.filter(v => {
      const matchSearch = !q ||
        v.id.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.driver.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || v.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [vehicles, search, statusFilter])

  async function handleAdd() {
    setSaving(true)
    const v = await api.vehicles.createVehicle({ ...form, tenantId: selectedTenant.id })
    setVehicles(prev => [...prev, v])
    setShowAdd(false)
    setForm({ ...EMPTY_FORM })
    setSaving(false)
  }

  function openEdit(v: Vehicle) {
    setEditVehicle(v)
    setEditForm({
      type: v.type,
      plate: v.plate,
      status: v.status,
      driver: v.driver,
      location: v.location,
      lastService: v.lastService,
      nextService: v.nextService,
      maxWeightKg: v.maxWeightKg,
      maxPackages: v.maxPackages,
    })
  }

  async function handleEdit() {
    if (!editVehicle) return
    setSaving(true)
    const updated = await api.vehicles.updateVehicle(editVehicle.id, editForm)
    setVehicles(prev => prev.map(v => v.id === editVehicle.id ? updated : v))
    setEditVehicle(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await api.vehicles.deleteVehicle(id)
    setVehicles(prev => prev.filter(v => v.id !== id))
    setDeleteId(null)
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const kpiCards: { label: string; value: number; icon: React.ElementType; color: string; bg: string; filterStatus: StatusFilter }[] = [
    {
      label: "Total Fleet",
      value: kpis.total,
      icon: Truck,
      color: "text-slate-700 dark:text-slate-300",
      bg: "",
      filterStatus: "all",
    },
    {
      label: "On Route",
      value: kpis.onRoute,
      icon: MapPin,
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30",
      filterStatus: "good",
    },
    {
      label: "Available",
      value: kpis.available,
      icon: CheckCircle2,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30",
      filterStatus: "good",
    },
    {
      label: "Needs Service",
      value: kpis.needsService,
      icon: AlertTriangle,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30",
      filterStatus: "needs_service",
    },
    {
      label: "In Repair",
      value: kpis.inRepair,
      icon: Wrench,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30",
      filterStatus: "in_repair",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Fleet Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track vehicles, maintenance schedules, and driver assignments.</p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {kpiCards.map(kpi => {
          const isActive = statusFilter === kpi.filterStatus && !(kpi.filterStatus === "good" && kpi.label === "On Route" && statusFilter !== "good")
          return (
            <Card
              key={kpi.label}
              onClick={() => setStatusFilter(kpi.filterStatus)}
              className={`${kpi.bg} shadow-none cursor-pointer transition-all hover:shadow-sm ${
                isActive ? "ring-2 ring-slate-400 dark:ring-slate-500 ring-offset-1 dark:ring-offset-slate-900" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-slate-600 dark:text-slate-400">{kpi.label}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent className="pb-3 px-3">
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Vehicle Directory */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vehicle Directory</CardTitle>
            <CardDescription>Monitor vehicle status, assignments, and maintenance alerts.</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className="h-9 w-64 rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle ID</TableHead>
                <TableHead>Type & Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Driver</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                    No vehicles found.
                  </TableCell>
                </TableRow>
              ) : filtered.map(v => {
                const overdue = isOverdue(v.nextService)
                const soon = isServiceSoon(v.nextService)
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium font-mono text-sm">{v.id}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{v.type}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{v.plate}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          v.status === "good"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40"
                            : v.status === "needs_service"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40"
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40"
                        }
                      >
                        {v.status === "good" ? "Good" : v.status === "needs_service" ? "Needs Service" : "In Repair"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className={`text-sm ${v.driver === "Unassigned" ? "text-slate-400 italic" : "text-slate-700 dark:text-slate-300"}`}>
                          {v.driver}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        {v.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.nextService === "TBD" || !v.nextService ? (
                        <span className="text-xs text-slate-400 italic">TBD</span>
                      ) : (
                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          overdue
                            ? "text-red-600 dark:text-red-400"
                            : soon
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {overdue && <AlertCircle className="h-3 w-3 shrink-0" />}
                          {soon && !overdue && <AlertTriangle className="h-3 w-3 shrink-0" />}
                          <span>{v.nextService}</span>
                          {overdue && <span className="text-red-500 dark:text-red-400">(Overdue)</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div>{v.maxWeightKg.toLocaleString()} kg</div>
                        <div>{v.maxPackages} pkgs</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 mr-1"
                        onClick={() => openEdit(v)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => setDeleteId(v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Vehicle Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm form={form} setForm={setForm} drivers={drivers} locations={locations} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.plate.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Vehicle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Modal */}
      <Dialog open={!!editVehicle} onOpenChange={open => { if (!open) setEditVehicle(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vehicle — {editVehicle?.id}</DialogTitle>
          </DialogHeader>
          <VehicleForm form={editForm} setForm={setEditForm} drivers={drivers} locations={locations} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditVehicle(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !editForm.plate.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Vehicle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to remove{" "}
            <strong className="text-slate-900 dark:text-white">{deleteId}</strong> from the fleet?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
