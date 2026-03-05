"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  Undo2,
  AlertTriangle,
  Download,
  CheckCircle2,
  Truck,
} from "lucide-react"

// ─── Mock report data ─────────────────────────────────────────────────────────

const BEST_SELLERS = [
  { sku: "TC-MS-003", name: "Wireless Mouse Pro", category: "Peripherals", unitsSold: 584, revenue: "$52,530", trend: 18.4, rank: 1 },
  { sku: "TC-HB-005", name: "USB-C Hub 7-in-1", category: "Accessories", unitsSold: 431, revenue: "$30,022", trend: 12.1, rank: 2 },
  { sku: "TC-KB-002", name: "Mechanical Keyboard", category: "Peripherals", unitsSold: 312, revenue: "$55,848", trend: 7.9, rank: 3 },
  { sku: "TC-4K-001", name: "4K Monitor 27\"", category: "Electronics", unitsSold: 218, revenue: "$76,322", trend: -3.2, rank: 4 },
  { sku: "TC-LP-006", name: "Laptop Stand Aluminum", category: "Accessories", unitsSold: 189, revenue: "$10,395", trend: 22.6, rank: 5 },
  { sku: "TC-WB-004", name: "Webcam HD 1080p", category: "Electronics", unitsSold: 156, revenue: "$20,124", trend: -1.8, rank: 6 },
  { sku: "TC-HS-007", name: "Noise Cancelling Headset", category: "Electronics", unitsSold: 88, revenue: "$19,272", trend: -8.5, rank: 7 },
]

const RETURN_ISSUES = [
  { id: "RET-4401", orderId: "ORD-5112", date: "Mar 1, 2026", product: "4K Monitor 27\"", sku: "TC-4K-001", qty: 2, reason: "Damaged in transit", disposition: "Quarantine", status: "completed" },
  { id: "RET-4402", orderId: "ORD-5098", date: "Feb 25, 2026", product: "Wireless Mouse Pro", sku: "TC-MS-003", qty: 1, reason: "Wrong item shipped", disposition: "Restock", status: "completed" },
  { id: "RET-4403", orderId: "ORD-5134", date: "Mar 3, 2026", product: "Mechanical Keyboard", sku: "TC-KB-002", qty: 1, reason: "Customer changed mind", disposition: "Restock", status: "inspecting" },
  { id: "RET-4404", orderId: "ORD-5141", date: "Mar 4, 2026", product: "Webcam HD 1080p", sku: "TC-WB-004", qty: 3, reason: "Defective – no power", disposition: "Supplier return", status: "pending" },
]

const DELIVERY_ISSUES = [
  { id: "DEL-8801", orderId: "ORD-5067", date: "Feb 22, 2026", customer: "Acme Corp", destination: "Austin, TX", issue: "Address not found", resolved: true, carrier: "FedEx" },
  { id: "DEL-8802", orderId: "ORD-5089", date: "Feb 27, 2026", customer: "Bright Media", destination: "Portland, OR", issue: "Package damaged on delivery", resolved: true, carrier: "UPS" },
  { id: "DEL-8803", orderId: "ORD-5118", date: "Mar 1, 2026", customer: "CloudPath Inc", destination: "Denver, CO", issue: "Delivery attempted, nobody home", resolved: false, carrier: "FedEx" },
  { id: "DEL-8804", orderId: "ORD-5129", date: "Mar 3, 2026", customer: "NovaStar Ltd", destination: "Chicago, IL", issue: "Package lost in transit", resolved: false, carrier: "DHL" },
  { id: "DEL-8805", orderId: "ORD-5131", date: "Mar 4, 2026", customer: "Pixel Works", destination: "New York, NY", issue: "Delayed – weather hold", resolved: false, carrier: "UPS" },
]

// ─── Simple bar chart ─────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ─── Export button helper ─────────────────────────────────────────────────────

function ExportBtn() {
  return (
    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
      <Download className="h-3.5 w-3.5" /> Export PDF
    </Button>
  )
}

// ─── Main Reports ─────────────────────────────────────────────────────────────

export function B2BReports() {
  const maxUnits = Math.max(...BEST_SELLERS.map(p => p.unitsSold))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="text-slate-500 mt-1">Product performance, returns, and delivery insights.</p>
        </div>
      </div>

      <Tabs defaultValue="best-sellers" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="best-sellers"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Best Sellers</TabsTrigger>
          <TabsTrigger value="returns"><Undo2 className="h-3.5 w-3.5 mr-1.5" />Return Issues</TabsTrigger>
          <TabsTrigger value="delivery"><Truck className="h-3.5 w-3.5 mr-1.5" />Delivery Issues</TabsTrigger>
        </TabsList>

        {/* ── Best Sellers ── */}
        <TabsContent value="best-sellers">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Best Selling Products</CardTitle>
                <CardDescription>Ranked by units shipped in the last 30 days.</CardDescription>
              </div>
              <ExportBtn />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Rank</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="w-40">Volume</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BEST_SELLERS.map(p => (
                    <TableRow key={p.sku}>
                      <TableCell>
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          p.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                          p.rank === 2 ? "bg-slate-100 text-slate-600" :
                          p.rank === 3 ? "bg-orange-100 text-orange-700" :
                          "text-slate-400"
                        }`}>
                          {p.rank}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{p.unitsSold.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{p.revenue}</TableCell>
                      <TableCell>
                        <MiniBar value={p.unitsSold} max={maxUnits}
                          color={p.rank <= 3 ? "bg-emerald-500" : "bg-slate-300"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`flex items-center justify-end gap-0.5 text-sm font-semibold ${p.trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {p.trend >= 0 ? "↑" : "↓"} {Math.abs(p.trend)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Return Issues ── */}
        <TabsContent value="returns">
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Returns", value: RETURN_ISSUES.length, color: "text-slate-900" },
                { label: "Pending", value: RETURN_ISSUES.filter(r => r.status === "pending").length, color: "text-amber-600" },
                { label: "Inspecting", value: RETURN_ISSUES.filter(r => r.status === "inspecting").length, color: "text-blue-600" },
                { label: "Completed", value: RETURN_ISSUES.filter(r => r.status === "completed").length, color: "text-emerald-600" },
              ].map(s => (
                <Card key={s.label} className="border-slate-200 shadow-sm">
                  <CardContent className="pt-5">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Return Issues</CardTitle>
                  <CardDescription>Products returned by customers — reasons, quantity, and warehouse disposition.</CardDescription>
                </div>
                <ExportBtn />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return ID</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Disposition</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RETURN_ISSUES.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.id}</TableCell>
                        <TableCell className="text-slate-500">{r.orderId}</TableCell>
                        <TableCell className="text-slate-500">{r.date}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{r.product}</p>
                            <p className="text-xs font-mono text-slate-400">{r.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{r.qty}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{r.reason}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.disposition}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={
                            r.status === "completed" ? "bg-emerald-500 hover:bg-emerald-600" :
                            r.status === "inspecting" ? "bg-blue-500 hover:bg-blue-600" :
                            "bg-amber-100 text-amber-700 border-amber-200"
                          }>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Delivery Issues ── */}
        <TabsContent value="delivery">
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Issues", value: DELIVERY_ISSUES.length, sub: "Last 30 days", colorClass: "text-slate-900" },
                { label: "Open Issues", value: DELIVERY_ISSUES.filter(d => !d.resolved).length, sub: "Require attention", colorClass: "text-red-600" },
                { label: "Resolved", value: DELIVERY_ISSUES.filter(d => d.resolved).length, sub: "No action needed", colorClass: "text-emerald-600" },
              ].map(s => (
                <Card key={s.label} className="border-slate-200 shadow-sm">
                  <CardContent className="pt-5">
                    <p className={`text-2xl font-bold ${s.colorClass}`}>{s.value}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
                    <p className="text-xs text-slate-400">{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Open issues alert */}
            {DELIVERY_ISSUES.some(d => !d.resolved) && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {DELIVERY_ISSUES.filter(d => !d.resolved).length} open delivery issues require attention.
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">Contact your account manager or the carrier directly to resolve these issues.</p>
                </div>
              </div>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Delivery Issues</CardTitle>
                  <CardDescription>Failed deliveries, delays, and exceptions reported by carriers.</CardDescription>
                </div>
                <ExportBtn />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue ID</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DELIVERY_ISSUES.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.id}</TableCell>
                        <TableCell className="text-slate-500">{d.orderId}</TableCell>
                        <TableCell className="text-slate-500">{d.date}</TableCell>
                        <TableCell className="font-medium">{d.customer}</TableCell>
                        <TableCell className="text-slate-500">{d.destination}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{d.carrier}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 text-sm max-w-[180px]">{d.issue}</TableCell>
                        <TableCell className="text-right">
                          {d.resolved ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Open
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
