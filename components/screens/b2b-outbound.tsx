"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  SendToBack,
  Plus,
  X,
  Truck,
  Package,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react"
import { useDemo } from "@/context/DemoContext"
import { B2BOutboundShipment, B2BOutboundLine, B2BProduct } from "@/types"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: B2BProduct[] = [
  { id: "prod-1", tenantId: "tenant-1", sku: "TC-4K-001", name: "4K Monitor 27\"", category: "Electronics", weight: "5.2kg", dimensions: "64×38×10cm", unitCost: "$249.99", unitsPerCase: 1, minStock: 10, currentStock: 3, status: "active", createdAt: "2026-01-01" },
  { id: "prod-2", tenantId: "tenant-1", sku: "TC-KB-002", name: "Mechanical Keyboard", category: "Peripherals", weight: "1.1kg", dimensions: "44×15×4cm", unitCost: "$129.00", unitsPerCase: 5, minStock: 20, currentStock: 7, status: "active", createdAt: "2026-01-01" },
  { id: "prod-3", tenantId: "tenant-1", sku: "TC-MS-003", name: "Wireless Mouse Pro", category: "Peripherals", weight: "0.2kg", dimensions: "12×6×4cm", unitCost: "$59.99", unitsPerCase: 10, minStock: 30, currentStock: 12, status: "active", createdAt: "2026-01-01" },
  { id: "prod-4", tenantId: "tenant-1", sku: "TC-WB-004", name: "Webcam HD 1080p", category: "Electronics", weight: "0.3kg", dimensions: "10×6×6cm", unitCost: "$89.99", unitsPerCase: 6, minStock: 15, currentStock: 0, status: "active", createdAt: "2026-01-01" },
  { id: "prod-5", tenantId: "tenant-1", sku: "TC-HB-005", name: "USB-C Hub 7-in-1", category: "Accessories", weight: "0.15kg", dimensions: "11×4×2cm", unitCost: "$44.99", unitsPerCase: 12, minStock: 25, currentStock: 18, status: "active", createdAt: "2026-01-01" },
]

const INITIAL_SHIPMENTS: B2BOutboundShipment[] = [
  {
    id: "OB-2601", tenantId: "tenant-1", referenceNumber: "REF-TC-20260218", carrier: "FedEx Freight",
    expectedArrival: "2026-02-20", status: "received", totalPallets: 3, totalCartons: 24,
    notes: "Handle with care – monitors", createdAt: "2026-02-18",
    lines: [
      { id: "l1", shipmentId: "OB-2601", productId: "prod-1", sku: "TC-4K-001", productName: "4K Monitor 27\"", quantity: 10, unitsPerCase: 1 },
      { id: "l2", shipmentId: "OB-2601", productId: "prod-2", sku: "TC-KB-002", productName: "Mechanical Keyboard", quantity: 50, unitsPerCase: 5 },
    ],
  },
  {
    id: "OB-2602", tenantId: "tenant-1", referenceNumber: "REF-TC-20260225", carrier: "UPS Ground",
    expectedArrival: "2026-02-27", status: "received", totalPallets: 2, totalCartons: 18,
    notes: "", createdAt: "2026-02-25",
    lines: [
      { id: "l3", shipmentId: "OB-2602", productId: "prod-3", sku: "TC-MS-003", productName: "Wireless Mouse Pro", quantity: 120, unitsPerCase: 10 },
    ],
  },
  {
    id: "OB-2603", tenantId: "tenant-1", referenceNumber: "REF-TC-20260301", carrier: "DHL Express",
    expectedArrival: "2026-03-03", status: "in_transit", totalPallets: 1, totalCartons: 10,
    notes: "Priority shipment", createdAt: "2026-03-01",
    lines: [
      { id: "l4", shipmentId: "OB-2603", productId: "prod-4", sku: "TC-WB-004", productName: "Webcam HD 1080p", quantity: 30, unitsPerCase: 6 },
      { id: "l5", shipmentId: "OB-2603", productId: "prod-5", sku: "TC-HB-005", productName: "USB-C Hub 7-in-1", quantity: 60, unitsPerCase: 12 },
    ],
  },
  {
    id: "OB-2604", tenantId: "tenant-1", referenceNumber: "REF-TC-20260304", carrier: "FedEx Freight",
    expectedArrival: "2026-03-07", status: "scheduled", totalPallets: 4, totalCartons: 32,
    notes: "Restock monitors and keyboards", createdAt: "2026-03-04",
    lines: [
      { id: "l6", shipmentId: "OB-2604", productId: "prod-1", sku: "TC-4K-001", productName: "4K Monitor 27\"", quantity: 20, unitsPerCase: 1 },
      { id: "l7", shipmentId: "OB-2604", productId: "prod-2", sku: "TC-KB-002", productName: "Mechanical Keyboard", quantity: 80, unitsPerCase: 5 },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: B2BOutboundShipment["status"]) {
  switch (status) {
    case "draft":      return <Badge variant="outline" className="border-slate-400 text-slate-500">Draft</Badge>
    case "scheduled":  return <Badge variant="outline" className="border-blue-500 text-blue-600">Scheduled</Badge>
    case "in_transit": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">In Transit</Badge>
    case "received":   return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Received</Badge>
    case "cancelled":  return <Badge variant="outline" className="border-red-400 text-red-500">Cancelled</Badge>
  }
}

// ─── New Shipment Modal ───────────────────────────────────────────────────────

function NewShipmentModal({
  tenantId,
  tenantName,
  onClose,
  onSubmit,
}: {
  tenantId: string
  tenantName: string
  onClose: () => void
  onSubmit: (s: B2BOutboundShipment) => void
}) {
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [carrier, setCarrier] = React.useState("FedEx Freight")
  const [expectedArrival, setExpectedArrival] = React.useState("")
  const [totalPallets, setTotalPallets] = React.useState(1)
  const [totalCartons, setTotalCartons] = React.useState(0)
  const [notes, setNotes] = React.useState("")
  const [lines, setLines] = React.useState<Array<{ productId: string; sku: string; productName: string; quantity: number; unitsPerCase: number }>>([
    { productId: "", sku: "", productName: "", quantity: 1, unitsPerCase: 1 }
  ])
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    const suffix = Date.now().toString().slice(-6)
    setReferenceNumber(`REF-${tenantId.toUpperCase().replace("TENANT-", "TC-")}-${suffix}`)
  }, [tenantId])

  const updateLine = (idx: number, field: string, val: string | number) => {
    setLines(prev => {
      const next = [...prev]
      if (field === "productId") {
        const product = MOCK_PRODUCTS.find(p => p.id === val)
        next[idx] = {
          ...next[idx],
          productId: String(val),
          sku: product?.sku ?? "",
          productName: product?.name ?? "",
          unitsPerCase: product?.unitsPerCase ?? 1,
        }
      } else {
        next[idx] = { ...next[idx], [field]: val }
      }
      return next
    })
    // Auto-calculate total cartons
    const updated = [...lines]
    updated[idx] = { ...updated[idx], [field]: val }
    const cartons = updated.reduce((sum, l) => sum + Math.ceil(l.quantity / (l.unitsPerCase || 1)), 0)
    setTotalCartons(cartons)
  }

  const addLine = () => setLines(prev => [...prev, { productId: "", sku: "", productName: "", quantity: 1, unitsPerCase: 1 }])
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = () => {
    if (!referenceNumber || !carrier || !expectedArrival || lines.some(l => !l.productId)) return
    setSubmitting(true)
    const id = `OB-${Date.now().toString().slice(-4)}`
    const shipment: B2BOutboundShipment = {
      id,
      tenantId,
      referenceNumber,
      carrier,
      expectedArrival,
      status: "scheduled",
      totalPallets,
      totalCartons,
      notes,
      createdAt: new Date().toISOString().split("T")[0],
      lines: lines.map((l, i) => ({ id: `l-${i}`, shipmentId: id, ...l })),
    }
    setTimeout(() => {
      onSubmit(shipment)
      setSubmitting(false)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <SendToBack className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Outbound Shipment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Auto-populated tenant info */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Sending From</p>
            <p className="font-semibold text-blue-900">{tenantName}</p>
            <p className="text-xs text-blue-500 mt-0.5">Account ID: {tenantId} · Auto-syncs to warehouse inbound on submission</p>
          </div>

          {/* Shipment details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reference Number</label>
              <input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                placeholder="REF-XXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carrier</label>
              <select value={carrier} onChange={e => setCarrier(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400">
                <option>FedEx Freight</option>
                <option>UPS Ground</option>
                <option>DHL Express</option>
                <option>USPS Priority</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expected Arrival at Warehouse</label>
              <input type="date" value={expectedArrival} onChange={e => setExpectedArrival(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Pallets</label>
              <input type="number" min={1} value={totalPallets} onChange={e => setTotalPallets(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          {/* Product Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Products</label>
              <Button size="sm" variant="ghost" onClick={addLine} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                  <select
                    value={line.productId}
                    onChange={e => updateLine(idx, "productId", e.target.value)}
                    className="h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400"
                  >
                    <option value="">Select product…</option>
                    {MOCK_PRODUCTS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">Qty:</span>
                    <input type="number" min={1} value={line.quantity}
                      onChange={e => updateLine(idx, "quantity", Number(e.target.value))}
                      className="w-20 h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">Per case:</span>
                    <input type="number" min={1} value={line.unitsPerCase}
                      onChange={e => updateLine(idx, "unitsPerCase", Number(e.target.value))}
                      className="w-16 h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm focus:outline-none focus:border-slate-400" />
                  </div>
                  <button onClick={() => removeLine(idx)} disabled={lines.length === 1}
                    className="text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes for Warehouse</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Handling instructions, special requirements…"
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 resize-none" />
          </div>

          {/* Sync notice */}
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700">
              This shipment will automatically sync as an <strong>Inbound</strong> record in the warehouse system — no manual entry needed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-slate-900 hover:bg-slate-800 gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendToBack className="h-4 w-4" />}
            {submitting ? "Submitting…" : "Submit Shipment"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Shipment Row ─────────────────────────────────────────────────────────────

function ShipmentRow({ shipment }: { shipment: B2BOutboundShipment }) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(v => !v)}
      >
        <TableCell>
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </TableCell>
        <TableCell className="font-medium">{shipment.id}</TableCell>
        <TableCell className="font-mono text-xs text-slate-500">{shipment.referenceNumber}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-400" />
            {shipment.carrier}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            {shipment.expectedArrival}
          </div>
        </TableCell>
        <TableCell className="text-center">{shipment.totalPallets} pal / {shipment.totalCartons} ctn</TableCell>
        <TableCell className="text-right">{statusBadge(shipment.status)}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-slate-50/50">
          <TableCell colSpan={7} className="px-8 py-3">
            <div className="space-y-2">
              {shipment.notes && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {shipment.notes}
                </p>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <th className="pb-1 text-left">SKU</th>
                    <th className="pb-1 text-left">Product</th>
                    <th className="pb-1 text-right">Qty</th>
                    <th className="pb-1 text-right">Per Case</th>
                    <th className="pb-1 text-right">Cartons</th>
                  </tr>
                </thead>
                <tbody>
                  {shipment.lines.map(line => (
                    <tr key={line.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-1 font-mono text-xs text-slate-400">{line.sku}</td>
                      <td className="py-1">{line.productName}</td>
                      <td className="py-1 text-right">{line.quantity}</td>
                      <td className="py-1 text-right">{line.unitsPerCase}</td>
                      <td className="py-1 text-right">{Math.ceil(line.quantity / line.unitsPerCase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function B2BOutbound({ autoOpenModal, onAutoOpenConsumed }: { autoOpenModal?: boolean; onAutoOpenConsumed?: () => void } = {}) {
  const { selectedTenant } = useDemo()
  const [shipments, setShipments] = React.useState<B2BOutboundShipment[]>(INITIAL_SHIPMENTS)
  const [showModal, setShowModal] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (autoOpenModal) {
      setShowModal(true)
      onAutoOpenConsumed?.()
    }
  }, [autoOpenModal, onAutoOpenConsumed])

  const handleSubmit = (s: B2BOutboundShipment) => {
    setShipments(prev => [s, ...prev])
    setShowModal(false)
    setSuccess(`Shipment ${s.id} submitted and synced to warehouse inbound.`)
    setTimeout(() => setSuccess(null), 4000)
  }

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === "in_transit").length,
    scheduled: shipments.filter(s => s.status === "scheduled").length,
    received: shipments.filter(s => s.status === "received").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Outbound Shipments</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Packages you&apos;ve sent to the warehouse for storage &amp; fulfillment.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-slate-900 hover:bg-slate-800 gap-2">
          <Plus className="h-4 w-4" /> Add New Shipment
        </Button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Shipments", value: stats.total, icon: Package, color: "bg-slate-50 text-slate-600" },
          { label: "Scheduled", value: stats.scheduled, icon: Clock, color: "bg-blue-50 text-blue-600" },
          { label: "In Transit", value: stats.inTransit, icon: Truck, color: "bg-amber-50 text-amber-600" },
          { label: "Received", value: stats.received, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shipments table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>Click a row to expand product details. New shipments auto-sync to warehouse inbound.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Shipment ID</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Expected Arrival</TableHead>
                <TableHead className="text-center">Volume</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map(s => <ShipmentRow key={s.id} shipment={s} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <NewShipmentModal
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.name}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
