"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp } from "lucide-react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useDemo } from "@/context/DemoContext"
import { supabaseProvider } from "@/data/providers/supabase"
import { Order } from "@/types"

type Range = "7D" | "30D"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function toISODate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return parsed.toISOString().slice(0, 10)
}

function buildDailySeries(orders: Order[], range: Range) {
  const today = new Date()
  const days = range === "7D" ? 7 : 30
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (days - 1 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const count = orders.filter((order) => toISODate(order.date) === dateStr).length
    return {
      name: range === "7D" ? DAY_NAMES[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
      date: dateStr,
      orders: count,
    }
  })
}

function calcDelta(series: Array<{ orders: number }>) {
  const midpoint = Math.floor(series.length / 2)
  const previous = series.slice(0, midpoint).reduce((sum, day) => sum + day.orders, 0)
  const current = series.slice(midpoint).reduce((sum, day) => sum + day.orders, 0)
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export function OrderReports() {
  const { selectedTenant } = useDemo()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [range, setRange] = React.useState<Range>("7D")
  const [vendorFilter, setVendorFilter] = React.useState("all")

  React.useEffect(() => {
    async function loadOrders() {
      setLoading(true)
      try {
        const data = await supabaseProvider.orders.getOrdersByTenant(selectedTenant.id)
        setOrders(data)
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [selectedTenant.id])

  const vendors = React.useMemo(() => {
    const unique = Array.from(new Set(orders.map((order) => order.client).filter(Boolean)))
    return unique.sort((a, b) => a.localeCompare(b))
  }, [orders])

  const filteredOrders = React.useMemo(() => {
    if (vendorFilter === "all") return orders
    return orders.filter((order) => order.client === vendorFilter)
  }, [orders, vendorFilter])

  const chartData = React.useMemo(() => buildDailySeries(filteredOrders, range), [filteredOrders, range])
  const totalOrders = filteredOrders.length
  const trendDelta = calcDelta(chartData)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Order Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Supabase-backed daily order volume and trends for {selectedTenant.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="all">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            {(["7D", "30D"] as Range[]).map((item) => (
              <button
                key={item}
                onClick={() => setRange(item)}
                className={`rounded px-2.5 py-1 text-xs font-semibold ${
                  range === item
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders ({range})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalOrders}</div>
            <p className="text-xs text-slate-500">Filtered by vendor selection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trend vs previous window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={`text-3xl font-bold ${trendDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {trendDelta >= 0 ? "+" : ""}
              {trendDelta}%
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <TrendingUp className="h-3.5 w-3.5" />
              Based on first half vs second half of selected range
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vendors in scope</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{vendors.length}</div>
            <Badge variant="secondary">
              {vendorFilter === "all" ? "All vendors" : vendorFilter}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Daily Order Volume</CardTitle>
            <CardDescription>Orders created each day from Supabase orders data.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Order Trends</CardTitle>
            <CardDescription>Line trend over the same date range and vendor scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={330}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#0f172a" strokeWidth={2.25} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
