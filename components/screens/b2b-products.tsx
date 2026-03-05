"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Package,
  Plus,
  X,
  Upload,
  Search,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Pencil,
  Barcode,
} from "lucide-react"
import { useDemo } from "@/context/DemoContext"
import { B2BProduct } from "@/types"

// ─── Initial mock product catalog ─────────────────────────────────────────────

const INITIAL_PRODUCTS: B2BProduct[] = [
  {
    id: "prod-1", tenantId: "tenant-1", sku: "TC-4K-001", name: "4K Monitor 27\"",
    category: "Electronics", barcode: "0194501234561", weight: "5.2kg",
    dimensions: "64×38×10cm", unitCost: "$249.99", sellPrice: "$349.99",
    unitsPerCase: 1, minStock: 10, currentStock: 3, status: "active", createdAt: "2026-01-15",
  },
  {
    id: "prod-2", tenantId: "tenant-1", sku: "TC-KB-002", name: "Mechanical Keyboard",
    category: "Peripherals", barcode: "0194501234562", weight: "1.1kg",
    dimensions: "44×15×4cm", unitCost: "$129.00", sellPrice: "$179.00",
    unitsPerCase: 5, minStock: 20, currentStock: 7, status: "active", createdAt: "2026-01-15",
  },
  {
    id: "prod-3", tenantId: "tenant-1", sku: "TC-MS-003", name: "Wireless Mouse Pro",
    category: "Peripherals", barcode: "0194501234563", weight: "0.2kg",
    dimensions: "12×6×4cm", unitCost: "$59.99", sellPrice: "$89.99",
    unitsPerCase: 10, minStock: 30, currentStock: 12, status: "active", createdAt: "2026-01-15",
  },
  {
    id: "prod-4", tenantId: "tenant-1", sku: "TC-WB-004", name: "Webcam HD 1080p",
    category: "Electronics", barcode: "0194501234564", weight: "0.3kg",
    dimensions: "10×6×6cm", unitCost: "$89.99", sellPrice: "$129.00",
    unitsPerCase: 6, minStock: 15, currentStock: 0, status: "active", createdAt: "2026-01-20",
  },
  {
    id: "prod-5", tenantId: "tenant-1", sku: "TC-HB-005", name: "USB-C Hub 7-in-1",
    category: "Accessories", barcode: "0194501234565", weight: "0.15kg",
    dimensions: "11×4×2cm", unitCost: "$44.99", sellPrice: "$69.99",
    unitsPerCase: 12, minStock: 25, currentStock: 18, status: "active", createdAt: "2026-01-20",
  },
  {
    id: "prod-6", tenantId: "tenant-1", sku: "TC-LP-006", name: "Laptop Stand Aluminum",
    category: "Accessories", barcode: "0194501234566", weight: "0.8kg",
    dimensions: "26×26×5cm", unitCost: "$34.99", sellPrice: "$54.99",
    unitsPerCase: 8, minStock: 20, currentStock: 22, status: "active", createdAt: "2026-02-01",
  },
  {
    id: "prod-7", tenantId: "tenant-1", sku: "TC-HS-007", name: "Noise Cancelling Headset",
    category: "Electronics", barcode: "0194501234567", weight: "0.35kg",
    dimensions: "20×18×9cm", unitCost: "$149.00", sellPrice: "$219.00",
    unitsPerCase: 4, minStock: 10, currentStock: 9, status: "inactive", createdAt: "2026-02-10",
  },
]

const CATEGORIES = ["Electronics", "Peripherals", "Accessories", "Software", "Other"]

// ─── Product Form Modal ───────────────────────────────────────────────────────

interface ProductFormData {
  sku: string; name: string; category: string; barcode: string;
  weight: string; dimensions: string; unitCost: string; sellPrice: string;
  unitsPerCase: number; minStock: number; status: B2BProduct["status"]
}

const emptyForm = (): ProductFormData => ({
  sku: "", name: "", category: "Electronics", barcode: "",
  weight: "", dimensions: "", unitCost: "", sellPrice: "",
  unitsPerCase: 1, minStock: 10, status: "active",
})

function ProductModal({
  initial,
  tenantId,
  onClose,
  onSave,
}: {
  initial?: B2BProduct
  tenantId: string
  onClose: () => void
  onSave: (product: B2BProduct) => void
}) {
  const [form, setForm] = React.useState<ProductFormData>(
    initial
      ? {
          sku: initial.sku, name: initial.name, category: initial.category,
          barcode: initial.barcode ?? "", weight: initial.weight ?? "",
          dimensions: initial.dimensions ?? "", unitCost: initial.unitCost ?? "",
          sellPrice: initial.sellPrice ?? "", unitsPerCase: initial.unitsPerCase ?? 1,
          minStock: initial.minStock ?? 10, status: initial.status,
        }
      : emptyForm()
  )
  const [saving, setSaving] = React.useState(false)

  const set = (k: keyof ProductFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = (e.target.type === "number") ? Number(e.target.value) : e.target.value
    setForm(prev => ({ ...prev, [k]: val }))
  }

  const handleSave = () => {
    if (!form.sku || !form.name) return
    setSaving(true)
    setTimeout(() => {
      onSave({
        id: initial?.id ?? `prod-${Date.now()}`,
        tenantId,
        ...form,
        currentStock: initial?.currentStock ?? 0,
        createdAt: initial?.createdAt ?? new Date().toISOString().split("T")[0],
      })
      setSaving(false)
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{initial ? "Edit Product" : "Add Product"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Core identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU <span className="text-red-500">*</span></label>
              <input value={form.sku} onChange={set("sku")} placeholder="e.g. TC-4K-001"
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select value={form.category} onChange={set("category")}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={set("name")} placeholder="Full product name"
              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Barcode / UPC</label>
            <div className="relative">
              <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input value={form.barcode} onChange={set("barcode")} placeholder="e.g. 0194501234561"
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 pl-9 pr-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          {/* Physical */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight</label>
              <input value={form.weight} onChange={set("weight")} placeholder="e.g. 1.2kg"
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dimensions (L×W×H)</label>
              <input value={form.dimensions} onChange={set("dimensions")} placeholder="e.g. 30×20×10cm"
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Cost</label>
              <input value={form.unitCost} onChange={set("unitCost")} placeholder="$0.00"
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sell Price</label>
              <input value={form.sellPrice} onChange={set("sellPrice")} placeholder="$0.00"
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          {/* Fulfillment */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Units per Case</label>
              <input type="number" min={1} value={form.unitsPerCase} onChange={set("unitsPerCase")}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min. Stock Level</label>
              <input type="number" min={0} value={form.minStock} onChange={set("minStock")}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select value={form.status} onChange={set("status")}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Product"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (count: number) => void }) {
  const [dragging, setDragging] = React.useState(false)
  const [imported, setImported] = React.useState(false)

  const handleDrop = () => {
    setImported(true)
    setTimeout(() => {
      onImport(12)
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import Products (CSV)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-6">
          {!imported ? (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleDrop() }}
                onClick={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Upload className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">Drag &amp; drop your CSV, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Supports: .csv, .xlsx</p>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Required columns: <code className="bg-slate-100 px-1 rounded">sku, name, category, weight, dimensions, unit_cost, sell_price, units_per_case, min_stock</code>
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
              <p className="text-sm text-slate-600">Importing products…</p>
            </div>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function B2BProducts() {
  const { selectedTenant } = useDemo()
  const [products, setProducts] = React.useState<B2BProduct[]>(INITIAL_PRODUCTS)
  const [search, setSearch] = React.useState("")
  const [showModal, setShowModal] = React.useState(false)
  const [editProduct, setEditProduct] = React.useState<B2BProduct | undefined>()
  const [showImport, setShowImport] = React.useState(false)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (product: B2BProduct) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === product.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = product; return next
      }
      return [product, ...prev]
    })
    setShowModal(false)
    setEditProduct(undefined)
    setSuccessMsg(editProduct ? "Product updated." : `Product ${product.sku} added.`)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleImport = (count: number) => {
    setShowImport(false)
    setSuccessMsg(`${count} products imported successfully.`)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === "active").length,
    lowStock: products.filter(p => (p.currentStock ?? 0) <= (p.minStock ?? 0)).length,
    outOfStock: products.filter(p => (p.currentStock ?? 0) === 0).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Product Catalog</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage products for outbound shipments and fulfillment.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => { setEditProduct(undefined); setShowModal(true) }} className="bg-slate-900 hover:bg-slate-800 gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: stats.total, color: "bg-slate-50 text-slate-600" },
          { label: "Active", value: stats.active, color: "bg-emerald-50 text-emerald-600" },
          { label: "Low Stock", value: stats.lowStock, color: "bg-amber-50 text-amber-600" },
          { label: "Out of Stock", value: stats.outOfStock, color: "bg-red-50 text-red-600" },
        ].map(s => (
          <Card key={s.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>Your full product catalog. Products are used when creating outbound shipments.</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SKU or name…"
              className="h-9 w-56 rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 pl-9 pr-3 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Sell Price</TableHead>
                <TableHead className="text-center">Per Case</TableHead>
                <TableHead className="text-center">Min Stock</TableHead>
                <TableHead className="text-center">In Warehouse</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(product => {
                const isLow = (product.currentStock ?? 0) <= (product.minStock ?? 0)
                const isOut = (product.currentStock ?? 0) === 0
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs text-slate-500">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">{product.barcode ?? "—"}</TableCell>
                    <TableCell className="text-slate-500">{product.weight ?? "—"}</TableCell>
                    <TableCell className="text-slate-500">{product.dimensions ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{product.unitCost ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{product.sellPrice ?? "—"}</TableCell>
                    <TableCell className="text-center">{product.unitsPerCase ?? 1}</TableCell>
                    <TableCell className="text-center">{product.minStock ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                        {product.currentStock ?? 0}
                      </span>
                      {isOut && <AlertTriangle className="inline h-3.5 w-3.5 text-red-400 ml-1" />}
                      {isLow && !isOut && <AlertTriangle className="inline h-3.5 w-3.5 text-amber-400 ml-1" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={product.status === "active" ? "default" : "secondary"}
                        className={product.status === "active" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => { setEditProduct(product); setShowModal(true) }}
                        className="text-slate-300 hover:text-slate-700 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-10 text-slate-400">
                    No products match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      {showModal && (
        <ProductModal
          initial={editProduct}
          tenantId={selectedTenant.id}
          onClose={() => { setShowModal(false); setEditProduct(undefined) }}
          onSave={handleSave}
        />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
    </div>
  )
}
