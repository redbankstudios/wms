"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Plus, Building2, MoreHorizontal, Mail, Phone, ArrowLeft, Package, Undo2, TrendingUp, CreditCard, MapPin, Calendar, User, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Tenant } from "@/types"
import { getProvider } from "@/data"
import type { HistoricVolumePoint } from "@/data/providers/IDataProvider"

const STATUS_FILTERS = ["all", "active", "onboarding", "inactive", "pending"] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export function TenantsManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null)
  const [tenants, setTenants] = React.useState<Tenant[]>([])
  const [historicData, setHistoricData] = React.useState<HistoricVolumePoint[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const formatStorage = (value: number) => value.toLocaleString()

  async function toggleSuspend(tenant: Tenant) {
    const newStatus = tenant.status === "active" ? "inactive" : "active"
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: newStatus as Tenant["status"] } : t))
    if (selectedTenant?.id === tenant.id) setSelectedTenant(prev => prev ? { ...prev, status: newStatus as Tenant["status"] } : prev)
  }

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await api.tenants.getTenants()
      setTenants(data)
      setLoading(false)
    }
    loadData()
  }, [api])

  React.useEffect(() => {
    async function loadHistoricData() {
      if (selectedTenant) {
        const data = await api.tenants.getHistoricVolumeData(selectedTenant.id)
        setHistoricData(data)
      }
    }
    loadHistoricData()
  }, [api, selectedTenant?.id])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (selectedTenant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTenant(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center">
                {selectedTenant.name}
                <Badge className="ml-3" variant={selectedTenant.status === "active" ? "default" : selectedTenant.status === "onboarding" ? "secondary" : "outline"}>
                  {selectedTenant.status.toUpperCase()}
                </Badge>
              </h2>
              <p className="text-slate-500">Tenant ID: {selectedTenant.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
              Impersonate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={selectedTenant.status === "active" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}
              onClick={() => toggleSuspend(selectedTenant)}
            >
              {selectedTenant.status === "active" ? "Suspend" : "Activate"}
            </Button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Shipped (MTD)</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,245</div>
              <p className="text-xs text-slate-500">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Returned (MTD)</CardTitle>
              <Undo2 className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">32</div>
              <p className="text-xs text-slate-500">2.5% return rate</p>
            </CardContent>
          </Card>
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Volume</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStorage(selectedTenant.storageUsed)}</div>
            <p className="text-xs text-slate-500">Pallets (Limit: {formatStorage(selectedTenant.storageCapacity)})</p>
          </CardContent>
        </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,450</div>
              <p className="text-xs text-slate-500">Estimated current month</p>
            </CardContent>
          </Card>
        </div>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Primary Contact</h4>
                <div className="space-y-3">
                  <div className="flex items-center text-sm"><User className="h-4 w-4 mr-3 text-slate-400"/> {selectedTenant.contact}</div>
                  <div className="flex items-center text-sm"><Mail className="h-4 w-4 mr-3 text-slate-400"/> {selectedTenant.email}</div>
                  <div className="flex items-center text-sm"><Phone className="h-4 w-4 mr-3 text-slate-400"/> {selectedTenant.phone}</div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Company Info</h4>
                <div className="space-y-3">
                  <div className="flex items-start text-sm"><MapPin className="h-4 w-4 mr-3 text-slate-400 mt-0.5 flex-shrink-0"/> <span>{selectedTenant.address}</span></div>
                  <div className="flex items-center text-sm"><Calendar className="h-4 w-4 mr-3 text-slate-400"/> Joined {selectedTenant.joined}</div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Billing & Plan</h4>
                <div className="space-y-3">
                  <div className="flex items-center text-sm"><Package className="h-4 w-4 mr-3 text-slate-400"/> {selectedTenant.plan} Plan</div>
                  <div className="flex items-center text-sm"><CreditCard className="h-4 w-4 mr-3 text-slate-400"/> {selectedTenant.paymentMethod}</div>
                  <div className="flex items-center text-sm"><Calendar className="h-4 w-4 mr-3 text-slate-400"/> {selectedTenant.billingCycle}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historic Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Historic Volume (Last 12 Months)</CardTitle>
            <CardDescription>Monthly breakdown of shipped orders, returns, and storage volume.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="shipped" name="Orders Shipped" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="returned" name="Orders Returned" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="volume" name="Storage Volume (Pallets)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tenants</h2>
        <div className="flex items-center space-x-2">
          <Button><Plus className="mr-2 h-4 w-4" /> Add Tenant</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-slate-500">{tenants.filter(t => t.status === "active").length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.filter(t => t.status === "onboarding").length}</div>
            <p className="text-xs text-slate-500">Pending activation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Storage</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStorage(tenants.reduce((s, t) => s + t.storageUsed, 0))}</div>
            <p className="text-xs text-slate-500">Pallets across all tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$142,500</div>
            <p className="text-xs text-slate-500">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-row items-center justify-between mb-4">
            <div>
              <CardTitle>Tenant Directory</CardTitle>
              <CardDescription>Manage warehouse clients, storage limits, and billing plans.</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants..."
                className="h-9 w-56 rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100">
            {STATUS_FILTERS.map(s => {
              const count = s === "all" ? tenants.length : tenants.filter(t => t.status === s).length
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors capitalize ${
                    statusFilter === s ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Tenant Name</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Storage (Pallets)</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants
                .filter(t => {
                  if (statusFilter !== "all" && t.status !== statusFilter) return false
                  if (search) {
                    const q = search.toLowerCase()
                    return t.name.toLowerCase().includes(q) || t.contact.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
                  }
                  return true
                })
                .map((tenant) => (
                <TableRow key={tenant.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium">
                    <div>{tenant.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{tenant.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{tenant.contact}</div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {tenant.email}</span>
                      <span className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {tenant.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === "active" ? "default" : tenant.status === "onboarding" ? "secondary" : "outline"}>
                      {tenant.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{tenant.storageLabel ?? `${formatStorage(tenant.storageUsed)} / ${formatStorage(tenant.storageCapacity)}`}</TableCell>
                  <TableCell>{tenant.plan}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTenant(tenant)}>View</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={tenant.status === "active" ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"}
                      onClick={() => toggleSuspend(tenant)}
                    >
                      {tenant.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
