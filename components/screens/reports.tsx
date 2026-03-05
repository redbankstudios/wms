"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  Line, PieChart, Pie, Cell, Legend, CartesianGrid, Area, AreaChart,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Download, Package, Truck, Undo2, TrendingUp, Clock, BarChart3 } from "lucide-react"

// ── Data ───────────────────────────────────────────────────────
const storageDataByPeriod: Record<string, { name: string; usage: number; capacity: number }[]> = {
  "7D": [
    { name: "Mon", usage: 4200, capacity: 5000 },
    { name: "Tue", usage: 4350, capacity: 5000 },
    { name: "Wed", usage: 4500, capacity: 5000 },
    { name: "Thu", usage: 4480, capacity: 5000 },
    { name: "Fri", usage: 4600, capacity: 5000 },
    { name: "Sat", usage: 4550, capacity: 5000 },
    { name: "Sun", usage: 4620, capacity: 5000 },
  ],
  "30D": [
    { name: "Week 1", usage: 4000, capacity: 5000 },
    { name: "Week 2", usage: 4200, capacity: 5000 },
    { name: "Week 3", usage: 4500, capacity: 5000 },
    { name: "Week 4", usage: 4800, capacity: 5000 },
  ],
  "90D": [
    { name: "Jan", usage: 3800, capacity: 5000 },
    { name: "Feb", usage: 4100, capacity: 5000 },
    { name: "Mar", usage: 4600, capacity: 5000 },
  ],
  "12M": [
    { name: "Apr", usage: 3200, capacity: 5000 },
    { name: "May", usage: 3500, capacity: 5000 },
    { name: "Jun", usage: 3800, capacity: 5000 },
    { name: "Jul", usage: 4000, capacity: 5000 },
    { name: "Aug", usage: 3900, capacity: 5000 },
    { name: "Sep", usage: 4100, capacity: 5000 },
    { name: "Oct", usage: 4300, capacity: 5000 },
    { name: "Nov", usage: 4500, capacity: 5000 },
    { name: "Dec", usage: 4700, capacity: 5000 },
    { name: "Jan", usage: 4400, capacity: 5000 },
    { name: "Feb", usage: 4600, capacity: 5000 },
    { name: "Mar", usage: 4800, capacity: 5000 },
  ],
}

const productivityData = [
  { name: "John D.", picks: 120, packs: 80 },
  { name: "Alice S.", picks: 150, packs: 90 },
  { name: "Bob J.", picks: 90, packs: 110 },
  { name: "Charlie B.", picks: 130, packs: 100 },
  { name: "Sarah M.", picks: 145, packs: 95 },
]

const routePerformanceData = [
  { name: "On-Time", value: 85 },
  { name: "Late", value: 10 },
  { name: "Failed", value: 5 },
]

const returnRatesData = [
  { month: "Oct", returns: 18, rate: 1.8 },
  { month: "Nov", returns: 24, rate: 2.4 },
  { month: "Dec", returns: 42, rate: 3.8 },
  { month: "Jan", returns: 28, rate: 2.6 },
  { month: "Feb", returns: 22, rate: 2.0 },
  { month: "Mar", returns: 32, rate: 2.5 },
]

const inventoryAgingData = [
  { bucket: "< 30 days", items: 1240 },
  { bucket: "30–60 days", items: 580 },
  { bucket: "60–90 days", items: 220 },
  { bucket: "90–180 days", items: 95 },
  { bucket: "> 180 days", items: 38 },
]

const clientProfitability = [
  { client: "TechCorp", revenue: 15000, cost: 8000 },
  { client: "BeanRoasters", revenue: 8500, cost: 5000 },
  { client: "FitLife", revenue: 12000, cost: 7500 },
  { client: "HomeGoods", revenue: 6200, cost: 4100 },
]

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"]
const PERIODS = ["7D", "30D", "90D", "12M"] as const
type Period = typeof PERIODS[number]

// ── KPI cards ─────────────────────────────────────────────────
const KPI_CARDS = [
  { label: "Orders Shipped (MTD)", value: "1,245", delta: "+12%", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "On-Time Delivery", value: "85%", delta: "+3%", icon: Truck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Return Rate", value: "2.5%", delta: "-0.3%", icon: Undo2, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Storage Utilization", value: "92%", delta: "+4%", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
  { label: "Avg Pick Time", value: "4.2 min", delta: "-0.5 min", icon: Clock, color: "text-slate-700", bg: "bg-slate-100" },
  { label: "Gross Margin", value: "41%", delta: "+2%", icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
]

export function ReportsDashboard() {
  const [period, setPeriod] = React.useState<Period>("30D")
  const storageData = storageDataByPeriod[period]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map(kpi => {
          const Icon = kpi.icon
          const isPositive = kpi.delta.startsWith("+")
          const isNegativeGood = kpi.label === "Return Rate" || kpi.label === "Avg Pick Time"
          const good = isNegativeGood ? !isPositive : isPositive
          return (
            <Card key={kpi.label} className={`${kpi.bg} border-0 shadow-none`}>
              <CardContent className="p-4">
                <Icon className={`h-4 w-4 ${kpi.color} mb-2`} />
                <p className="text-xs text-slate-500 mb-0.5">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${good ? "text-emerald-600" : "text-red-500"}`}>{kpi.delta} vs last period</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Storage Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Utilization</CardTitle>
            <CardDescription>Pallet positions occupied vs capacity.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={storageData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={2} fill="url(#usageGrad)" name="Usage" />
                <Line type="monotone" dataKey="capacity" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" name="Capacity" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Productivity */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Productivity</CardTitle>
            <CardDescription>Pick and pack tasks completed by employee.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productivityData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="picks" fill="#1e293b" name="Picks" radius={[0, 3, 3, 0]} />
                <Bar dataKey="packs" fill="#94a3b8" name="Packs" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Route Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Route Performance</CardTitle>
            <CardDescription>Delivery success rates and exceptions.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={240}>
              <PieChart>
                <Pie
                  data={routePerformanceData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {routePerformanceData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {routePerformanceData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-slate-600">{d.name}</span>
                  <span className="font-bold text-slate-900 ml-auto pl-4">{d.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Return Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Return Rates</CardTitle>
            <CardDescription>Monthly return volume and rate %.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={returnRatesData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="returns" fill="#f59e0b" name="Returns" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} name="Rate %" dot={{ fill: "#ef4444", r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Inventory Aging */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Aging</CardTitle>
            <CardDescription>Items by days in warehouse — flag slow-moving stock.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={inventoryAgingData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="items" name="Items" radius={[4, 4, 0, 0]}>
                  {inventoryAgingData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#10b981" : i === 1 ? "#3b82f6" : i === 2 ? "#f59e0b" : i === 3 ? "#f97316" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Profitability */}
        <Card>
          <CardHeader>
            <CardTitle>Client Profitability</CardTitle>
            <CardDescription>Revenue vs costs and gross profit per client.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-2">
              {clientProfitability.map((item) => {
                const profit = item.revenue - item.cost
                const margin = Math.round((profit / item.revenue) * 100)
                const pct = Math.round((item.revenue / Math.max(...clientProfitability.map(c => c.revenue))) * 100)
                return (
                  <div key={item.client} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{item.client}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">${item.revenue.toLocaleString()} rev</span>
                        <span className="font-semibold text-emerald-600">+${profit.toLocaleString()} ({margin}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
