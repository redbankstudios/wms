"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  ArrowRightLeft, Search, AlertTriangle, Loader2, Plus,
  Pencil, Trash2, Package, BoxesIcon, ShieldAlert, Clock, X, Filter
} from "lucide-react"
import { InventoryItem, StorageLocation, Client } from "@/types"
import { useDemo } from "@/context/DemoContext"
import { getProvider } from "@/data"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ["available", "reserved", "quarantined", "pending_receive", "picked"] as const
type Status = typeof STATUSES[number]

const STATUS_LABELS: Record<Status, string> = {
  available:       "Available",
  reserved:        "Reserved",
  quarantined:     "Quarantined",
  pending_receive: "Pending Receive",
  picked:          "Picked",
}

const inputCls = "flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:opacity-50"
const selectCls = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:opacity-50"

function statusBadgeVariant(status: Status): "default" | "secondary" | "destructive" | "outline" {
  if (status === "available") return "default"
  if (status === "reserved") return "secondary"
  if (status === "quarantined" || status === "pending_receive") return "destructive"
  return "outline"
}

// ─── Item Form Dialog ─────────────────────────────────────────────────────────

interface ItemForm {
  sku: string; name: string; client: string; location: string
  status: Status; qty: string; minStock: string
}

const emptyItemForm: ItemForm = {
  sku: "", name: "", client: "", location: "", status: "available", qty: "0", minStock: "0",
}

function ItemDialog({
  open, onOpenChange, initial, clients, locations, tenantId, onSaved, api,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: InventoryItem | null
  clients: Client[]
  locations: StorageLocation[]
  tenantId: string
  onSaved: () => void
  api: ReturnType<typeof getProvider>
}) {
  const [form, setForm] = React.useState<ItemForm>(emptyItemForm)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm(initial ? {
        sku: initial.sku, name: initial.name, client: initial.client,
        location: initial.location, status: initial.status as Status,
        qty: String(initial.qty), minStock: String(initial.minStock),
      } : emptyItemForm)
    }
  }, [open, initial])

  const set = (k: keyof ItemForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (initial) {
        await api.inventory.updateInventoryItem(initial.id, {
          sku: form.sku, name: form.name, client: form.client,
          location: form.location, status: form.status,
          qty: Number(form.qty), minStock: Number(form.minStock),
        })
      } else {
        await api.inventory.createInventoryItem({
          tenantId, sku: form.sku, name: form.name, client: form.client,
          location: form.location, status: form.status,
          qty: Number(form.qty), minStock: Number(form.minStock),
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">SKU</label>
              <input className={inputCls} required value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="e.g. SKU-1001" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value as Status)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Product Name</label>
            <input className={inputCls} required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Wireless Earbuds" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Client</label>
            <select className={selectCls} required value={form.client} onChange={e => set("client", e.target.value)}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Storage Location</label>
            {locations.length > 0 ? (
              <select className={selectCls} value={form.location} onChange={e => set("location", e.target.value)}>
                <option value="">Select location…</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.code}>
                    {loc.code} ({loc.currentPallets}/{loc.maxPallets} pallets used)
                  </option>
                ))}
              </select>
            ) : (
              <input className={inputCls} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. R-01-A-1-1" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Quantity</label>
              <input className={inputCls} type="number" min={0} required value={form.qty} onChange={e => set("qty", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Min Stock Level</label>
              <input className={inputCls} type="number" min={0} required value={form.minStock} onChange={e => set("minStock", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Transfer Dialog ──────────────────────────────────────────────────────────

function TransferDialog({
  open, onOpenChange, inventory, locations, onSaved, api, preselectedItem,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  inventory: InventoryItem[]
  locations: StorageLocation[]
  onSaved: () => void
  api: ReturnType<typeof getProvider>
  preselectedItem: InventoryItem | null
}) {
  const [itemId, setItemId] = React.useState("")
  const [newLocation, setNewLocation] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) { setItemId(preselectedItem?.id ?? ""); setNewLocation("") }
  }, [open, preselectedItem])

  const selectedItem = inventory.find(i => i.id === itemId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemId || !newLocation) return
    setSaving(true)
    try {
      await api.inventory.updateInventoryItem(itemId, { location: newLocation })
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Transfer Stock</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Item</label>
            <select className={selectCls} required value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">Select item…</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>
              ))}
            </select>
          </div>
          {selectedItem && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm">
              <p className="text-slate-500 text-xs">Current location</p>
              <p className="font-mono font-medium text-slate-900">{selectedItem.location || "—"}</p>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium">New Location</label>
            {locations.length > 0 ? (
              <select className={selectCls} required value={newLocation} onChange={e => setNewLocation(e.target.value)}>
                <option value="">Select destination…</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.code} disabled={loc.code === selectedItem?.location}>
                    {loc.code} ({loc.currentPallets}/{loc.maxPallets} pallets)
                    {loc.code === selectedItem?.location ? " — current" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input className={inputCls} required value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. R-03-A-1-2" />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !itemId || !newLocation || newLocation === selectedItem?.location}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InventoryManagement() {
  const { selectedTenant } = useDemo()
  const api = React.useMemo(() => getProvider(), [])
  const tenantId = selectedTenant.id

  const [inventory, setInventory] = React.useState<InventoryItem[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [locations, setLocations] = React.useState<StorageLocation[]>([])
  const [loading, setLoading] = React.useState(true)

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<Status | "">("")

  const [addOpen, setAddOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<InventoryItem | null>(null)
  const [deleteItem, setDeleteItem] = React.useState<InventoryItem | null>(null)
  const [transferOpen, setTransferOpen] = React.useState(false)
  const [transferItem, setTransferItem] = React.useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    const [inv, cl, locs] = await Promise.all([
      api.inventory.getInventoryByTenant(tenantId),
      api.clients.getClientsByTenant(tenantId),
      api.storage.getAllStorageLocations(tenantId),
    ])
    setInventory(inv)
    setClients(cl)
    setLocations(locs)
    setLoading(false)
  }, [api, tenantId])

  React.useEffect(() => { loadData() }, [loadData])

  // KPIs
  const totalSkus   = inventory.length
  const totalUnits  = inventory.reduce((s, i) => s + i.qty, 0)
  const lowStock    = inventory.filter(i => i.qty < i.minStock).length
  const quarantined = inventory.filter(i => i.status === "quarantined").length

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return inventory.filter(item => {
      const matchQ = !q || item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) ||
                     item.client.toLowerCase().includes(q) || item.location.toLowerCase().includes(q)
      return matchQ && (!statusFilter || item.status === statusFilter)
    })
  }, [inventory, search, statusFilter])

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    await api.inventory.deleteInventoryItem(deleteItem.id)
    setDeleteItem(null)
    setDeleting(false)
    await loadData()
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const pendingReceive = inventory.filter(i => i.status === "pending_receive")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventory Management</h2>
          <p className="text-slate-500 mt-1">Manage stock levels, locations, and client assignments.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => { setTransferItem(null); setTransferOpen(true) }}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Stock
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Inventory
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <BoxesIcon className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkus}</div>
            <p className="text-xs text-slate-500">Unique products tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits.toLocaleString()}</div>
            <p className="text-xs text-slate-500">Across all locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStock > 0 ? "text-amber-600" : ""}`}>{lowStock}</div>
            <p className="text-xs text-slate-500">Below minimum threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarantined</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${quarantined > 0 ? "text-red-600" : ""}`}>{quarantined}</div>
            <p className="text-xs text-slate-500">Items under hold</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Receive Banner */}
      {pendingReceive.length > 0 && (
        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {pendingReceive.length} item{pendingReceive.length > 1 ? "s" : ""} pending receive
              </p>
              <p className="text-xs text-blue-600">
                {pendingReceive.map(i => i.name).join(", ")} — expected from active inbound shipments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>
              {filtered.length} of {inventory.length} item{inventory.length !== 1 ? "s" : ""}
              {(search || statusFilter) ? " (filtered)" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search SKU, name, client…"
                className="h-9 w-64 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
              {search && (
                <button className="absolute right-2 top-2.5" onClick={() => setSearch("")}>
                  <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as Status | "")}
            >
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {(search || statusFilter) && (
              <Button variant="ghost" size="sm" className="h-9 px-2 text-slate-500"
                onClick={() => { setSearch(""); setStatusFilter("") }}>
                <Filter className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">No items match your filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const isLow = item.qty < item.minStock
                  return (
                    <TableRow key={item.id} className={isLow ? "bg-amber-50/40" : ""}>
                      <TableCell className="font-mono text-xs font-medium">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{item.client}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {item.location || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.status as Status)} className="text-[11px]">
                          {STATUS_LABELS[item.status as Status] ?? item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-500 text-sm">{item.minStock}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          <span className={`font-bold text-sm ${isLow ? "text-amber-600" : "text-slate-900"}`}>
                            {item.qty.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Transfer location"
                            onClick={() => { setTransferItem(item); setTransferOpen(true) }}>
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => setEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteItem(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Dialogs */}
      <ItemDialog open={addOpen} onOpenChange={setAddOpen} initial={null}
        clients={clients} locations={locations} tenantId={tenantId} onSaved={loadData} api={api} />
      <ItemDialog open={!!editItem} onOpenChange={v => { if (!v) setEditItem(null) }} initial={editItem}
        clients={clients} locations={locations} tenantId={tenantId} onSaved={loadData} api={api} />
      <TransferDialog open={transferOpen} onOpenChange={v => { if (!v) { setTransferOpen(false); setTransferItem(null) } }}
        inventory={inventory} locations={locations} onSaved={loadData} api={api} preselectedItem={transferItem} />

      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Inventory Item</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 mt-2">
            Are you sure you want to delete <strong>{deleteItem?.name}</strong> ({deleteItem?.sku})?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
