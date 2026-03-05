"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, Building, Users, Bell, Link as LinkIcon, Shield, Layers, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { WarehouseZone, Rack, Client } from "@/types"
import { useDemo } from "@/context/DemoContext"
import { getProvider } from "@/data"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ZONE_TYPES = ["reserve", "forward_pick", "returns", "overflow", "staging"] as const
const ZONE_COLORS = ["blue", "emerald", "amber", "red", "slate"] as const

const inputCls = "flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:opacity-50"
const selectCls = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:opacity-50"

const WAREHOUSE_ID = "WH-01"

const zoneColorDot: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-slate-500",
}

// ─── Zone Dialog ──────────────────────────────────────────────────────────────

interface ZoneForm {
  name: string
  type: string
  color: string
  totalCapacity: string
}

const emptyZoneForm: ZoneForm = { name: "", type: "reserve", color: "blue", totalCapacity: "" }

interface ZoneDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: WarehouseZone | null
  tenantId: string
  onSaved: () => void
  api: ReturnType<typeof getProvider>
}

function ZoneDialog({ open, onOpenChange, initial, tenantId, onSaved, api }: ZoneDialogProps) {
  const [form, setForm] = React.useState<ZoneForm>(emptyZoneForm)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm(initial
        ? { name: initial.name, type: initial.type, color: initial.color, totalCapacity: String(initial.totalCapacity) }
        : emptyZoneForm
      )
    }
  }, [open, initial])

  const set = (k: keyof ZoneForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (initial) {
        await api.storage.updateZone(initial.id, {
          name: form.name,
          type: form.type as WarehouseZone["type"],
          color: form.color,
          totalCapacity: Number(form.totalCapacity),
        })
      } else {
        await api.storage.createZone({
          tenantId,
          warehouseId: WAREHOUSE_ID,
          name: form.name,
          type: form.type,
          color: form.color,
          totalCapacity: Number(form.totalCapacity),
        })
      }
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Zone" : "Add Zone"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Zone Name</label>
            <input className={inputCls} required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Reserve Storage" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value)}>
                {ZONE_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Color</label>
              <select className={selectCls} value={form.color} onChange={e => set("color", e.target.value)}>
                {ZONE_COLORS.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Total Capacity (pallet positions)</label>
            <input className={inputCls} type="number" min={1} required value={form.totalCapacity} onChange={e => set("totalCapacity", e.target.value)} placeholder="e.g. 500" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Save Changes" : "Create Zone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Rack Dialog ──────────────────────────────────────────────────────────────

interface RackForm {
  code: string
  zoneId: string
  side: string
  levelCount: string
  bayCount: string
  totalCapacity: string
  preferredClientId: string
}

const emptyRackForm: RackForm = { code: "", zoneId: "", side: "A", levelCount: "5", bayCount: "4", totalCapacity: "20", preferredClientId: "" }

interface RackDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Rack | null
  tenantId: string
  zones: WarehouseZone[]
  clients: Client[]
  onSaved: () => void
  api: ReturnType<typeof getProvider>
}

function RackDialog({ open, onOpenChange, initial, tenantId, zones, clients, onSaved, api }: RackDialogProps) {
  const [form, setForm] = React.useState<RackForm>(emptyRackForm)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            code: initial.code,
            zoneId: initial.zoneId,
            side: initial.side,
            levelCount: String(initial.levelCount),
            bayCount: String(initial.bayCount),
            totalCapacity: String(initial.totalCapacity),
            preferredClientId: initial.preferredClientId ?? "",
          }
        : { ...emptyRackForm, zoneId: zones[0]?.id ?? "" }
      )
    }
  }, [open, initial, zones])

  const set = (k: keyof RackForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (initial) {
        await api.storage.updateRack(initial.id, {
          code: form.code,
          side: form.side as Rack["side"],
          levelCount: Number(form.levelCount),
          bayCount: Number(form.bayCount),
          totalCapacity: Number(form.totalCapacity),
          preferredClientId: form.preferredClientId || null,
        })
      } else {
        await api.storage.createRack({
          tenantId,
          warehouseId: WAREHOUSE_ID,
          zoneId: form.zoneId,
          code: form.code,
          side: form.side,
          levelCount: Number(form.levelCount),
          bayCount: Number(form.bayCount),
          totalCapacity: Number(form.totalCapacity),
          preferredClientId: form.preferredClientId || undefined,
        })
      }
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Rack" : "Add Rack"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Rack Code</label>
              <input className={inputCls} required value={form.code} onChange={e => set("code", e.target.value)} placeholder="e.g. R-09" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Side</label>
              <select className={selectCls} value={form.side} onChange={e => set("side", e.target.value)}>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Zone</label>
            <select className={selectCls} required value={form.zoneId} onChange={e => set("zoneId", e.target.value)}>
              <option value="">Select zone…</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Levels</label>
              <input className={inputCls} type="number" min={1} required value={form.levelCount} onChange={e => set("levelCount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Bays</label>
              <input className={inputCls} type="number" min={1} required value={form.bayCount} onChange={e => set("bayCount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Capacity</label>
              <input className={inputCls} type="number" min={1} required value={form.totalCapacity} onChange={e => set("totalCapacity", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Preferred Client <span className="text-slate-400 font-normal">(optional)</span></label>
            <select className={selectCls} value={form.preferredClientId} onChange={e => set("preferredClientId", e.target.value)}>
              <option value="">No preference</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Save Changes" : "Add Rack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Warehouse Tab ─────────────────────────────────────────────────────────────

function WarehouseTab() {
  const { selectedTenant } = useDemo()
  const api = React.useMemo(() => getProvider(), [])
  const tenantId = selectedTenant.id

  const [zones, setZones] = React.useState<WarehouseZone[]>([])
  const [racks, setRacks] = React.useState<Rack[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)

  const [zoneDialog, setZoneDialog] = React.useState<{ open: boolean; zone?: WarehouseZone | null }>({ open: false })
  const [rackDialog, setRackDialog] = React.useState<{ open: boolean; rack?: Rack | null }>({ open: false })
  const [deleting, setDeleting] = React.useState<string | null>(null)

  const clientNameMap = React.useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients]
  )

  async function loadData() {
    setLoading(true)
    const [z, r, cl] = await Promise.all([
      api.storage.getWarehouseZones(tenantId),
      api.storage.getAllRacks(tenantId),
      api.clients.getClientsByTenant(tenantId),
    ])
    setZones(z)
    setRacks(r)
    setClients(cl)
    setLoading(false)
  }

  React.useEffect(() => { loadData() }, [api, tenantId])

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone? This cannot be undone.")) return
    setDeleting(id)
    await api.storage.deleteZone(id)
    await loadData()
    setDeleting(null)
  }

  async function deleteRack(id: string) {
    if (!confirm("Delete this rack? This cannot be undone.")) return
    setDeleting(id)
    await api.storage.deleteRack(id)
    await loadData()
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Zones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Warehouse Zones</CardTitle>
            <CardDescription>Define storage zones and their total pallet capacity.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setZoneDialog({ open: true, zone: null })}>
            <Plus className="mr-2 h-4 w-4" /> Add Zone
          </Button>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
              <p className="text-sm text-slate-500">No zones yet. Add your first zone.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map(zone => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {zone.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${zoneColorDot[zone.color] ?? "bg-slate-400"}`} />
                        <span className="text-sm capitalize">{zone.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{zone.totalCapacity}</TableCell>
                    <TableCell className="text-right">{zone.usedCapacity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setZoneDialog({ open: true, zone })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteZone(zone.id)}
                          disabled={deleting === zone.id}
                        >
                          {deleting === zone.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Racks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Racks</CardTitle>
            <CardDescription>Configure racks within zones. Each rack has levels, bays, and a capacity.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setRackDialog({ open: true, rack: null })}>
            <Plus className="mr-2 h-4 w-4" /> Add Rack
          </Button>
        </CardHeader>
        <CardContent>
          {racks.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
              <p className="text-sm text-slate-500">No racks yet. Add your first rack.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-center">Levels</TableHead>
                  <TableHead className="text-center">Bays</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead>Preferred Client</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {racks.map(rack => {
                  const zone = zones.find(z => z.id === rack.zoneId)
                  return (
                    <TableRow key={rack.id}>
                      <TableCell className="font-mono font-medium">{rack.code}</TableCell>
                      <TableCell>
                        {zone ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${zoneColorDot[zone.color] ?? "bg-slate-400"}`} />
                            <span className="text-sm">{zone.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{rack.zoneId}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{rack.side}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{rack.levelCount}</TableCell>
                      <TableCell className="text-center">{rack.bayCount}</TableCell>
                      <TableCell className="text-right">{rack.totalCapacity}</TableCell>
                      <TableCell>
                        {rack.preferredClientId
                          ? <span className="text-sm">{clientNameMap[rack.preferredClientId] ?? rack.preferredClientId}</span>
                          : <span className="text-xs text-slate-400 italic">None</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setRackDialog({ open: true, rack })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteRack(rack.id)}
                            disabled={deleting === rack.id}
                          >
                            {deleting === rack.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ZoneDialog
        open={zoneDialog.open}
        onOpenChange={v => setZoneDialog(d => ({ ...d, open: v }))}
        initial={zoneDialog.zone}
        tenantId={tenantId}
        onSaved={loadData}
        api={api}
      />
      <RackDialog
        open={rackDialog.open}
        onOpenChange={v => setRackDialog(d => ({ ...d, open: v }))}
        initial={rackDialog.rack}
        tenantId={tenantId}
        zones={zones}
        clients={clients}
        onSaved={loadData}
        api={api}
      />
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function Settings() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h2>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general"><Building className="h-4 w-4 mr-2" /> General</TabsTrigger>
          <TabsTrigger value="warehouse"><Layers className="h-4 w-4 mr-2" /> Warehouse</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" /> Users & Roles</TabsTrigger>
          <TabsTrigger value="integrations"><LinkIcon className="h-4 w-4 mr-2" /> Integrations</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Profile</CardTitle>
              <CardDescription>Update your facility&apos;s core information and operating hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Facility Name</label>
                  <input className={inputCls} defaultValue="Main Distribution Center" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Facility Code</label>
                  <input className={inputCls} defaultValue="MDC-01" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium leading-none">Address</label>
                  <input className={inputCls} defaultValue="123 Logistics Way, Suite 100, Industrial Park, CA 90210" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Timezone</label>
                  <select className={selectCls}>
                    <option>Pacific Time (PT)</option>
                    <option>Mountain Time (MT)</option>
                    <option>Central Time (CT)</option>
                    <option>Eastern Time (ET)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Capacity (Pallet Positions)</label>
                  <input type="number" className={inputCls} defaultValue="5000" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="warehouse">
          <WarehouseTab />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>Manage your API keys and third-party integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-medium text-slate-900">Shopify</h4>
                  <p className="text-sm text-slate-500">Sync orders and inventory automatically.</p>
                </div>
                <Button variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">Connected</Button>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-medium text-slate-900">Mapbox</h4>
                  <p className="text-sm text-slate-500">Routing, geocoding, and map visualizations.</p>
                </div>
                <Button variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">Connected</Button>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-medium text-slate-900">QuickBooks Online</h4>
                  <p className="text-sm text-slate-500">Sync invoices and billing data.</p>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Samsara</h4>
                  <p className="text-sm text-slate-500">Fleet telematics and ELD compliance.</p>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users & Roles</CardTitle>
              <CardDescription>Manage staff access and permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm text-slate-500">User management interface placeholder.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how and when you receive alerts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm text-slate-500">Notification settings placeholder.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage 2FA, password policies, and active sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm text-slate-500">Security settings placeholder.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
