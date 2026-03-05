"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  ShoppingCart,
  DollarSign,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ChevronDown,
  ArrowUpRight,
  Loader2,
  SendToBack,
  BarChart3,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import { InventoryItem, Order, Invoice } from "@/types"

// ─── Date Range Types ─────────────────────────────────────────────────────────

type Preset = 30 | 60 | 90 | 365
type DateRangeMode = "preset" | "custom"

interface DateRange {
  mode: DateRangeMode
  preset?: Preset
  from?: string
  to?: string
}

// ─── Mock B2B Data ────────────────────────────────────────────────────────────

const MOCK_SALES_BY_PERIOD: Record<Preset, { revenue: string; orders: number; trend: number }> = {
  30:  { revenue: "$48,230", orders: 142, trend: 12.4 },
  60:  { revenue: "$91,880", orders: 278, trend: 8.1 },
  90:  { revenue: "$136,450", orders: 401, trend: 5.7 },
  365: { revenue: "$524,900", orders: 1643, trend: 22.3 },
}

const MOCK_BILLING_BY_PERIOD: Record<Preset, { outstanding: string; paid: string; nextDue: string }> = {
  30:  { outstanding: "$3,200", paid: "$9,600", nextDue: "Mar 31, 2026" },
  60:  { outstanding: "$3,200", paid: "$19,200", nextDue: "Mar 31, 2026" },
  90:  { outstanding: "$3,200", paid: "$28,800", nextDue: "Mar 31, 2026" },
  365: { outstanding: "$3,200", paid: "$115,200", nextDue: "Mar 31, 2026" },
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  const presets: Preset[] = [30, 60, 90, 365]
  const [showCustom, setShowCustom] = React.useState(false)
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const handleCustomApply = () => {
    if (from && to) {
      onChange({ mode: "custom", from, to })
      setShowCustom(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-slate-400" />
      <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange({ mode: "preset", preset: p })}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-r border-slate-200 dark:border-slate-600 last:border-r-0 ${
              value.mode === "preset" && value.preset === p
                ? "bg-slate-900 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {p === 365 ? "1Y" : `${p}D`}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-colors ${
            value.mode === "custom" ? "bg-slate-900 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {value.mode === "custom" ? `${value.from} – ${value.to}` : "Custom"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {showCustom && (
        <div className="absolute top-16 right-6 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="h-9 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 text-sm" />
          </div>
          <Button size="sm" onClick={handleCustomApply} className="bg-slate-900 hover:bg-slate-800">Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  color = "blue",
  onClick,
}: {
  title: string
  value: string
  sub: string
  icon: React.ElementType
  trend?: number
  color?: "blue" | "emerald" | "violet" | "amber"
  onClick?: () => void
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <Card
      className={`border-slate-200 shadow-sm transition-shadow ${onClick ? "cursor-pointer hover:shadow-md hover:border-slate-300" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
          {onClick && <ArrowUpRight className="h-4 w-4 text-slate-400" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-slate-500">{sub}</p>
          {trend !== undefined && (
            <span className={`flex items-center text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Low Stock Table ──────────────────────────────────────────────────────────

function LowStockAlert({ items, onNewShipment }: { items: InventoryItem[]; onNewShipment?: () => void }) {
  const lowStock = items.filter(i => i.qty <= i.minStock)
  if (lowStock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-400" />
        <p className="font-medium text-slate-600">All stock levels are healthy</p>
        <p className="text-sm">No items are running low right now.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div
        className={`flex items-center justify-between gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 ${onNewShipment ? "cursor-pointer hover:bg-amber-100 transition-colors" : ""}`}
        onClick={onNewShipment}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{lowStock.length} item{lowStock.length > 1 ? "s" : ""} running low — consider sending a new outbound shipment to the warehouse.</span>
        </div>
        {onNewShipment && (
          <span className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap underline underline-offset-2">
            New Shipment <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">In Stock</TableHead>
            <TableHead className="text-right">Min. Stock</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lowStock.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-slate-500">{item.location}</TableCell>
              <TableCell className="text-right font-bold text-red-600">{item.qty}</TableCell>
              <TableCell className="text-right text-slate-500">{item.minStock}</TableCell>
              <TableCell className="text-right">
                {item.qty === 0
                  ? <Badge className="bg-red-100 text-red-700 border-red-200">Out of Stock</Badge>
                  : <Badge className="bg-amber-100 text-amber-700 border-amber-200">Low Stock</Badge>
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function B2BDashboard({ onNavigate }: { onNavigate?: (tab: string, action?: string) => void }) {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()
  const [loading, setLoading] = React.useState(true)
  const [inventory, setInventory] = React.useState<InventoryItem[]>([])
  const [orders, setOrders] = React.useState<Order[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [dateRange, setDateRange] = React.useState<DateRange>({ mode: "preset", preset: 30 })

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const [inv, ord] = await Promise.all([
        api.inventory.getInventoryByTenant(selectedTenant.id),
        api.orders.getOrdersByTenant(selectedTenant.id),
      ])
      setInventory(inv)
      setOrders(ord)
      // Mock invoices since not all providers expose billing directly
      setInvoices([
        { id: "INV-001", tenantId: selectedTenant.id, date: "Mar 1, 2026", amount: "$3,200.00", status: "due", period: "Mar 2026" },
        { id: "INV-002", tenantId: selectedTenant.id, date: "Feb 1, 2026", amount: "$3,200.00", status: "paid", period: "Feb 2026" },
        { id: "INV-003", tenantId: selectedTenant.id, date: "Jan 1, 2026", amount: "$2,800.00", status: "paid", period: "Jan 2026" },
      ])
      setLoading(false)
    }
    load()
  }, [api, selectedTenant.id])

  const salesData = MOCK_SALES_BY_PERIOD[dateRange.preset ?? 30]
  const billingData = MOCK_BILLING_BY_PERIOD[dateRange.preset ?? 30]

  const availableInventory = inventory.filter(i => i.status === "available").reduce((s, i) => s + i.qty, 0)
  const activeOrders = orders.filter(o => !["delivered"].includes(o.status)).length
  const lowStockCount = inventory.filter(i => i.qty <= i.minStock).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {selectedTenant.name}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here&apos;s an overview of your fulfillment activity.</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Available Inventory"
            value={availableInventory.toLocaleString()}
            sub={`${lowStockCount} item${lowStockCount !== 1 ? "s" : ""} running low`}
            icon={Package}
            color="blue"
            onClick={onNavigate ? () => onNavigate("inventory") : undefined}
          />
          <StatCard
            title="Active Orders"
            value={String(activeOrders)}
            sub={`${orders.filter(o => o.status === "shipped").length} shipped this period`}
            icon={ShoppingCart}
            color="violet"
            onClick={onNavigate ? () => onNavigate("orders") : undefined}
          />
          <StatCard
            title="Revenue"
            value={salesData.revenue}
            sub={`${salesData.orders} orders fulfilled`}
            icon={TrendingUp}
            trend={salesData.trend}
            color="emerald"
            onClick={onNavigate ? () => onNavigate("b2b-reports") : undefined}
          />
          <StatCard
            title="Outstanding Balance"
            value={billingData.outstanding}
            sub={`Next due: ${billingData.nextDue}`}
            icon={CreditCard}
            color="amber"
            onClick={onNavigate ? () => onNavigate("billing") : undefined}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="outbound" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="outbound"><SendToBack className="h-3.5 w-3.5 mr-1.5" />Outbound</TabsTrigger>
          <TabsTrigger value="products"><Package className="h-3.5 w-3.5 mr-1.5" />Products</TabsTrigger>
          <TabsTrigger value="inventory"><Package className="h-3.5 w-3.5 mr-1.5" />Inventory</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-3.5 w-3.5 mr-1.5" />Orders</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Reports</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Billing</TabsTrigger>
        </TabsList>

        {/* Outbound Tab – low stock items */}
        <TabsContent value="outbound">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Outbound Stock Alerts</CardTitle>
                <CardDescription>Items at or below minimum stock level at the warehouse.</CardDescription>
              </div>
              {onNavigate && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("b2b-outbound")} className="gap-1.5">
                  <SendToBack className="h-3.5 w-3.5" /> View All Outbound
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <LowStockAlert items={inventory} onNewShipment={onNavigate ? () => onNavigate("b2b-outbound", "new-shipment") : undefined} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Products</CardTitle>
                <CardDescription>Products registered and available for outbound shipments.</CardDescription>
              </div>
              {onNavigate && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("b2b-products")} className="gap-1.5">
                  Manage Products <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { sku: "TC-4K-001", name: "4K Monitor 27\"", category: "Electronics", cost: "$249.99", status: "active" },
                    { sku: "TC-KB-002", name: "Mechanical Keyboard", category: "Peripherals", cost: "$129.00", status: "active" },
                    { sku: "TC-MS-003", name: "Wireless Mouse Pro", category: "Peripherals", cost: "$59.99", status: "active" },
                    { sku: "TC-WB-004", name: "Webcam HD 1080p", category: "Electronics", cost: "$89.99", status: "inactive" },
                    { sku: "TC-HB-005", name: "USB-C Hub 7-in-1", category: "Accessories", cost: "$44.99", status: "active" },
                  ].map(p => (
                    <TableRow key={p.sku}>
                      <TableCell className="font-mono text-xs text-slate-500">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-slate-500">{p.category}</TableCell>
                      <TableCell className="text-right font-medium">{p.cost}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.status === "active" ? "default" : "secondary"}
                          className={p.status === "active" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>Real-time inventory levels at the warehouse.</CardDescription>
              </div>
              {onNavigate && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("inventory")} className="gap-1.5">
                  Full Inventory <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.slice(0, 6).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-slate-500">{item.location}</TableCell>
                        <TableCell className={`text-right font-bold ${item.qty <= item.minStock ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}>
                          {item.qty}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.status === "available" ? "default" : "secondary"}
                            className={item.status === "available" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your latest fulfillment orders.</CardDescription>
              </div>
              {onNavigate && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("orders")} className="gap-1.5">
                  All Orders <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 5).map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell className="text-slate-500">{order.date}</TableCell>
                        <TableCell>{order.items}</TableCell>
                        <TableCell className="text-slate-500">{order.destination}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={order.status === "shipped" ? "default" : "secondary"}
                            className={order.status === "shipped" || order.status === "delivered" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "Billing Report", desc: "Storage, handling & fulfillment charges", icon: CreditCard, color: "blue", tab: "b2b-reports" },
              { title: "Best Selling Products", desc: "Top performers by units shipped", icon: TrendingUp, color: "emerald", tab: "b2b-reports" },
              { title: "Return Issues", desc: "Products returned, reasons & dispositions", icon: Package, color: "amber", tab: "b2b-reports" },
              { title: "Delivery Issues", desc: "Failed deliveries, delays & exceptions", icon: AlertTriangle, color: "red", tab: "b2b-reports" },
            ].map(r => (
              <Card
                key={r.title}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigate?.("b2b-reports")}
              >
                <CardHeader>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                    r.color === "blue" ? "bg-blue-50 text-blue-600" :
                    r.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                    r.color === "amber" ? "bg-amber-50 text-amber-600" :
                    "bg-red-50 text-red-600"
                  }`}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <CardDescription>{r.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" className="gap-1.5 w-full">
                    View Report <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Billing Overview</CardTitle>
                <CardDescription>Recent invoices and payment status.</CardDescription>
              </div>
              {onNavigate && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("billing")} className="gap-1.5">
                  Manage Billing <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-medium text-amber-700 mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-amber-800">{billingData.outstanding}</p>
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Due {billingData.nextDue}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-xs font-medium text-emerald-700 mb-1">Paid this period</p>
                  <p className="text-2xl font-bold text-emerald-800">{billingData.paid}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> All cleared
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Storage Plan</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">500 Pallets</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enterprise tier</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.id}</TableCell>
                      <TableCell className="text-slate-500">{inv.period}</TableCell>
                      <TableCell className="text-slate-500">{inv.date}</TableCell>
                      <TableCell className="text-right font-medium">{inv.amount}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={inv.status === "paid" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-100 text-amber-700 border-amber-200"}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
