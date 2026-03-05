"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Download, CreditCard, FileText, ArrowUpRight, Loader2,
  Package, Truck, Layers, Plus, CheckCircle2, AlertCircle,
  TrendingUp, Calendar,
} from "lucide-react"
import { getProvider } from "@/data"
import { Invoice } from "@/types"
import { useDemo } from "@/context/DemoContext"

const USAGE_ITEMS = [
  {
    label: "Storage Fees",
    desc: "4,500 pallet positions avg",
    rate: "@ $0.50/day",
    amount: 2250,
    used: 4500,
    cap: 6000,
    unit: "pallets",
    icon: Layers,
    color: "bg-blue-500",
  },
  {
    label: "Pick & Pack Fees",
    desc: "1,200 items processed",
    rate: "@ $0.75/item",
    amount: 900,
    used: 1200,
    cap: 2000,
    unit: "items",
    icon: Package,
    color: "bg-purple-500",
  },
  {
    label: "Routing Fees",
    desc: "220 stops dispatched",
    rate: "@ $5.00/stop",
    amount: 1100,
    used: 220,
    cap: 400,
    unit: "stops",
    icon: Truck,
    color: "bg-amber-500",
  },
]

const MOCK_PAYMENT_METHODS = [
  { id: "pm1", type: "Visa", last4: "4242", expiry: "09/26", isDefault: true },
  { id: "pm2", type: "Mastercard", last4: "8888", expiry: "03/25", isDefault: false },
]

function UsageBar({ used, cap, color }: { used: number; cap: number; color: string }) {
  const pct = Math.min(Math.round((used / cap) * 100), 100)
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1 text-right">{used.toLocaleString()} / {cap.toLocaleString()} {color === "bg-blue-500" ? "pallets" : color === "bg-purple-500" ? "items" : "stops"} used</p>
    </div>
  )
}

export function BillingOverview() {
  const { selectedTenant } = useDemo()
  const api = React.useMemo(() => getProvider(), [])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [paymentMethods, setPaymentMethods] = React.useState(MOCK_PAYMENT_METHODS)
  const tenantId = selectedTenant.id

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await api.billing.getInvoicesByTenant(tenantId)
      setInvoices(data)
      setLoading(false)
    }
    loadData()
  }, [api, tenantId])

  function setDefault(id: string) {
    setPaymentMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })))
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const totalEstimated = USAGE_ITEMS.reduce((s, i) => s + i.amount, 0)
  const overdueInvoices = invoices.filter(i => i.status === "overdue" || i.status === "due")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Billing Overview</h2>
        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium px-3 py-1">
          {selectedTenant.type} Plan
        </Badge>
      </div>

      {/* Outstanding alert */}
      {overdueInvoices.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} totaling{" "}
            <strong>{overdueInvoices.reduce((s, i) => s + parseFloat(i.amount.replace(/[^0-9.]/g, "")), 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong>.
          </p>
          <Button size="sm" className="ml-auto bg-red-600 hover:bg-red-700 text-white shrink-0">Pay Now</Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Balance */}
        <Card className="bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-200 text-sm font-medium">Current Balance</CardTitle>
            <CardDescription className="text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Due Mar 15, 2026
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-4xl font-bold">${totalEstimated.toLocaleString()}.00</div>
            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold">
              Pay Now
            </Button>
          </CardContent>
        </Card>

        {/* Plan info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Current plan</span>
              <span className="font-semibold text-slate-900">{selectedTenant.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing cycle</span>
              <span className="font-medium text-slate-700">Monthly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next invoice</span>
              <span className="font-medium text-slate-700">Apr 1, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
                <CheckCircle2 className="h-3 w-3" />Active
              </span>
            </div>
          </CardContent>
        </Card>

        {/* MTD total */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Month-to-Date Charges</CardTitle>
            <CardDescription>Mar 1 – Mar 4, 2026 (estimated)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">${totalEstimated.toLocaleString()}.00</div>
            <p className="text-xs text-slate-500 mt-1">Across {USAGE_ITEMS.length} fee categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Usage</CardTitle>
          <CardDescription>Estimated charges based on activity so far in March 2026.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {USAGE_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="pb-5 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc} {item.rate}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-900">${item.amount.toLocaleString()}.00</p>
                  </div>
                  <UsageBar used={item.used} cap={item.cap} color={item.color} />
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-2 font-bold text-slate-900">
              <span>Estimated Total</span>
              <span className="text-lg">${totalEstimated.toLocaleString()}.00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Download or view past invoices.</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />Export All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Invoice</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400">No invoices found.</TableCell>
                </TableRow>
              )}
              {invoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-mono text-sm">{invoice.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{invoice.period}</TableCell>
                  <TableCell className="font-semibold">{invoice.amount}</TableCell>
                  <TableCell className="text-slate-500 text-sm">—</TableCell>
                  <TableCell>
                    <Badge
                      variant={invoice.status === "paid" ? "default" : "destructive"}
                      className={invoice.status === "paid" ? "bg-emerald-100 text-emerald-700 border-0" : ""}
                    >
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" title="Download PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="View invoice">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage cards used for automatic billing.</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />Add Card
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.map(pm => (
            <div key={pm.id} className={`flex items-center justify-between p-4 rounded-lg border ${pm.isDefault ? "border-blue-200 bg-blue-50" : "border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 rounded-md bg-slate-800 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{pm.type} ending in {pm.last4}</p>
                  <p className="text-xs text-slate-500">Expires {pm.expiry}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pm.isDefault ? (
                  <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />Default
                  </span>
                ) : (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDefault(pm.id)}>
                    Set as default
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
