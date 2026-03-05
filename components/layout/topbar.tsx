"use client"

import * as React from "react"
import { Bell, Search, Moon, Sun, Building2, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useDemo, DEMO_TENANTS, DEMO_ROLES } from "@/context/DemoContext"
import { useTheme } from "@/context/ThemeContext"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Role } from "@/types"
import { getProvider } from "@/data"
import { NAV_ITEMS } from "@/config/roleNavigation"

type SearchResult = {
  id: string
  type: string
  title: string
  subtitle?: string
  meta?: string
  tab: string
  searchText: string
}

const MAX_RESULTS = 12
const MIN_SEARCH_CHARS = 3

const getNavLabel = (tabId: string) => NAV_ITEMS.find(item => item.id === tabId)?.label ?? "Module"
const TYPE_STYLES: Record<string, { badge: string; card: string }> = {
  Tenant: { badge: "bg-slate-900 text-white border-slate-900", card: "border-l-4 border-l-slate-900" },
  Order: { badge: "bg-blue-600 text-white border-blue-600", card: "border-l-4 border-l-blue-600" },
  Inventory: { badge: "bg-emerald-600 text-white border-emerald-600", card: "border-l-4 border-l-emerald-600" },
  Task: { badge: "bg-amber-500 text-white border-amber-500", card: "border-l-4 border-l-amber-500" },
  Route: { badge: "bg-indigo-600 text-white border-indigo-600", card: "border-l-4 border-l-indigo-600" },
  Return: { badge: "bg-rose-600 text-white border-rose-600", card: "border-l-4 border-l-rose-600" },
  Vehicle: { badge: "bg-cyan-600 text-white border-cyan-600", card: "border-l-4 border-l-cyan-600" },
  Driver: { badge: "bg-teal-600 text-white border-teal-600", card: "border-l-4 border-l-teal-600" },
  Employee: { badge: "bg-purple-600 text-white border-purple-600", card: "border-l-4 border-l-purple-600" },
  Client: { badge: "bg-sky-600 text-white border-sky-600", card: "border-l-4 border-l-sky-600" },
  Product: { badge: "bg-orange-600 text-white border-orange-600", card: "border-l-4 border-l-orange-600" },
}

export function Topbar() {
  const { selectedTenant, setSelectedTenant, selectedRole, setSelectedRole, notificationCount } = useDemo()
  const { theme, toggle } = useTheme()
  const provider = React.useMemo(() => getProvider(), [])

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [index, setIndex] = React.useState<SearchResult[]>([])
  const [indexKey, setIndexKey] = React.useState<string>("")
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)
  const searchRef = React.useRef<HTMLDivElement>(null)
  const resultRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const canSeeAllTenants = selectedRole === "platform_owner"

  const buildIndex = React.useCallback(async (): Promise<SearchResult[]> => {
    const tenantId = selectedTenant.id
    const ordersPromise = canSeeAllTenants ? provider.orders.getAllOrders() : provider.orders.getOrdersByTenant(tenantId)
    const inventoryPromise = canSeeAllTenants ? provider.inventory.getAllInventory() : provider.inventory.getInventoryByTenant(tenantId)
    const tasksPromise = canSeeAllTenants ? provider.tasks.getAllTasks() : provider.tasks.getTasksByTenant(tenantId)
    const routesPromise = canSeeAllTenants ? provider.routes.getAllRoutes() : provider.routes.getRoutesByTenant(tenantId)
    const returnsPromise = canSeeAllTenants ? provider.returns.getAllReturns() : provider.returns.getReturnsByTenant(tenantId)
    const vehiclesPromise = canSeeAllTenants ? provider.vehicles.getAllVehicles() : provider.vehicles.getVehiclesByTenant(tenantId)
    const tenantsPromise = canSeeAllTenants ? provider.tenants.getTenants() : Promise.resolve([])

    const [ordersRes, inventoryRes, tasksRes, routesRes, returnsRes, vehiclesRes, tenantsRes, driversRes, usersRes, clientsRes, productsRes] =
      await Promise.allSettled([
        ordersPromise,
        inventoryPromise,
        tasksPromise,
        routesPromise,
        returnsPromise,
        vehiclesPromise,
        tenantsPromise,
        provider.drivers.getDriversByTenant(tenantId),
        provider.users.getUsersByTenant(tenantId),
        provider.clients.getClientsByTenant(tenantId),
        provider.products.getProductsByTenant(tenantId),
      ])

    const unwrap = <T,>(res: PromiseSettledResult<T>, fallback: T): T =>
      res.status === "fulfilled" ? res.value : fallback

    const orders = unwrap(ordersRes, [])
    const inventory = unwrap(inventoryRes, [])
    const tasks = unwrap(tasksRes, [])
    const routes = unwrap(routesRes, [])
    const returnsData = unwrap(returnsRes, [])
    const vehicles = unwrap(vehiclesRes, [])
    const tenants = unwrap(tenantsRes, [])
    const drivers = unwrap(driversRes, [])
    const users = unwrap(usersRes, [])
    const clients = unwrap(clientsRes, [])
    const products = unwrap(productsRes, [])

    const items: SearchResult[] = []

    tenants.forEach((tenant) => {
      items.push({
        id: tenant.id,
        type: "Tenant",
        title: tenant.name,
        subtitle: tenant.plan ? `${tenant.plan} plan` : "Tenant account",
        meta: tenant.status,
        tab: "tenants",
        searchText: `${tenant.name} ${tenant.plan ?? ""} ${tenant.status}`.toLowerCase(),
      })
    })

    orders.forEach((order) => {
      items.push({
        id: order.id,
        type: "Order",
        title: `${order.id} · ${order.client}`,
        subtitle: order.destination,
        meta: order.status,
        tab: "orders",
        searchText: `${order.id} ${order.client} ${order.destination} ${order.status}`.toLowerCase(),
      })
    })

    inventory.forEach((item) => {
      items.push({
        id: item.id,
        type: "Inventory",
        title: `${item.sku} · ${item.name}`,
        subtitle: item.location,
        meta: `${item.qty} on hand`,
        tab: "inventory",
        searchText: `${item.sku} ${item.name} ${item.location} ${item.client} ${item.status}`.toLowerCase(),
      })
    })

    tasks.forEach((task) => {
      items.push({
        id: task.id,
        type: "Task",
        title: `${task.type} · ${task.id}`,
        subtitle: `Assignee: ${task.assignee || "Unassigned"}`,
        meta: task.status,
        tab: "tasks",
        searchText: `${task.id} ${task.type} ${task.assignee ?? ""} ${task.status} ${task.priority}`.toLowerCase(),
      })
    })

    routes.forEach((route) => {
      items.push({
        id: route.id,
        type: "Route",
        title: `${route.id} · ${route.driverName}`,
        subtitle: `Vehicle ${route.vehicleId}`,
        meta: route.status,
        tab: "routes",
        searchText: `${route.id} ${route.driverName} ${route.vehicleId} ${route.status} ${route.shift}`.toLowerCase(),
      })
    })

    returnsData.forEach((ret) => {
      items.push({
        id: ret.id,
        type: "Return",
        title: `${ret.id} · ${ret.client}`,
        subtitle: `Order ${ret.orderId}`,
        meta: ret.status,
        tab: "returns",
        searchText: `${ret.id} ${ret.client} ${ret.orderId} ${ret.reason} ${ret.status}`.toLowerCase(),
      })
    })

    vehicles.forEach((vehicle) => {
      items.push({
        id: vehicle.id,
        type: "Vehicle",
        title: `${vehicle.plate} · ${vehicle.type}`,
        subtitle: vehicle.location,
        meta: vehicle.status.replace("_", " "),
        tab: "fleet",
        searchText: `${vehicle.id} ${vehicle.plate} ${vehicle.type} ${vehicle.location} ${vehicle.status}`.toLowerCase(),
      })
    })

    drivers.forEach((driver) => {
      items.push({
        id: driver.id,
        type: "Driver",
        title: driver.name,
        subtitle: driver.email ?? driver.phone ?? "Driver profile",
        meta: driver.status.replace("_", " "),
        tab: "drivers",
        searchText: `${driver.id} ${driver.name} ${driver.email ?? ""} ${driver.phone ?? ""} ${driver.status}`.toLowerCase(),
      })
    })

    users.forEach((user) => {
      items.push({
        id: user.id,
        type: "Employee",
        title: user.name,
        subtitle: user.email,
        meta: user.role.replace("_", " "),
        tab: "employees",
        searchText: `${user.id} ${user.name} ${user.email} ${user.role}`.toLowerCase(),
      })
    })

    clients.forEach((client) => {
      items.push({
        id: client.id,
        type: "Client",
        title: client.name,
        subtitle: client.contactName || client.contactEmail || "Client account",
        meta: client.status,
        tab: "b2b-dashboard",
        searchText: `${client.id} ${client.name} ${client.contactName ?? ""} ${client.contactEmail ?? ""} ${client.status}`.toLowerCase(),
      })
    })

    products.forEach((product) => {
      items.push({
        id: product.id,
        type: "Product",
        title: `${product.sku} · ${product.name}`,
        subtitle: product.status,
        meta: product.clientId ? `Client ${product.clientId}` : undefined,
        tab: "b2b-products",
        searchText: `${product.id} ${product.sku} ${product.name} ${product.clientId ?? ""} ${product.status}`.toLowerCase(),
      })
    })

    return items
  }, [canSeeAllTenants, provider, selectedTenant.id])

  const ensureIndex = React.useCallback(async () => {
    const key = `${selectedRole}:${selectedTenant.id}`
    if (indexKey === key && index.length > 0) return
    if (isLoading) return
    setIsLoading(true)
    try {
      const data = await buildIndex()
      setIndex(data)
      setIndexKey(key)
    } finally {
      setIsLoading(false)
    }
  }, [buildIndex, index, indexKey, isLoading, selectedRole, selectedTenant.id])

  React.useEffect(() => {
    if (query.trim().length < MIN_SEARCH_CHARS) {
      setResults([])
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }

    let active = true
    const run = async () => {
      await ensureIndex()
      if (!active) return
      const q = query.trim().toLowerCase()
      const filtered = index.filter(item => item.searchText.includes(q)).slice(0, MAX_RESULTS)
      setResults(filtered)
      setIsOpen(true)
      setActiveIndex(filtered.length > 0 ? 0 : -1)
    }

    const handle = window.setTimeout(run, 200)
    return () => {
      active = false
      window.clearTimeout(handle)
    }
  }, [ensureIndex, index, query])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchRef.current) return
      if (!searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navigateToTab = (tab: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.pushState({}, "", url.toString())
    window.dispatchEvent(new PopStateEvent("popstate"))
    setIsOpen(false)
    setQuery("")
    setActiveIndex(-1)
  }

  React.useEffect(() => {
    if (activeIndex < 0) return
    const node = resultRefs.current[activeIndex]
    node?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (event.key === "ArrowDown" && query.trim().length >= MIN_SEARCH_CHARS) {
        setIsOpen(true)
        setActiveIndex(0)
      }
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % results.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const selected = results[activeIndex]
      if (selected) navigateToTab(selected.tab)
    } else if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="flex h-16 items-center px-4 border-b bg-white dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center space-x-4">
        <div className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100 mr-4">
          WMS & Delivery
        </div>

        {/* Tenant Switcher */}
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Select
            value={selectedTenant.id}
            onValueChange={(val) => {
              const tenant = DEMO_TENANTS.find(t => t.id === val)
              if (tenant) setSelectedTenant(tenant)
            }}
          >
            <SelectTrigger className="w-[220px] h-9 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
              <SelectValue placeholder="Select Tenant" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_TENANTS.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Select
            value={selectedRole}
            onValueChange={(val) => setSelectedRole(val as Role)}
          >
            <SelectTrigger className="w-[220px] h-9 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
              <SelectValue placeholder="View As Role" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_ROLES.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= MIN_SEARCH_CHARS) setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-400"
          />

          {isOpen && (
            <div className="absolute left-0 top-11 z-40 w-[28rem] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Search results</span>
                {isLoading && (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Indexing data
                  </span>
                )}
              </div>

              {query.trim().length < MIN_SEARCH_CHARS && (
                <div className="px-4 py-3 text-xs text-slate-500">
                  Type at least {MIN_SEARCH_CHARS} characters to search the database.
                </div>
              )}

              {query.trim().length >= MIN_SEARCH_CHARS && results.length === 0 && !isLoading && (
                <div className="px-4 py-3 text-xs text-slate-500">
                  No matches found. Try a different keyword or ID.
                </div>
              )}

              {results.length > 0 && (
                <div className="max-h-[380px] overflow-y-auto p-3 space-y-2">
                  {results.map((result, idx) => {
                    const styles = TYPE_STYLES[result.type] ?? { badge: "bg-slate-700 text-white border-slate-700", card: "border-l-4 border-l-slate-700" }
                    return (
                      <Card
                        key={`${result.type}-${result.id}`}
                        className={`border-slate-100 bg-slate-50 transition hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 ${styles.card} ${
                          idx === activeIndex ? "ring-2 ring-blue-500/40 border-blue-200 bg-white dark:border-blue-500/40" : ""
                        }`}
                      >
                        <button
                          ref={(el) => { resultRefs.current[idx] = el }}
                          onClick={() => navigateToTab(result.tab)}
                          className="w-full text-left"
                        >
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`uppercase tracking-wide text-[10px] font-semibold ${styles.badge}`}>
                                {result.type}
                              </Badge>
                              <span className="text-xs text-slate-400">{getNavLabel(result.tab)}</span>
                            </div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div className="text-xs text-slate-500">{result.subtitle}</div>
                            )}
                            {result.meta && (
                              <div className="text-[11px] uppercase tracking-wide text-slate-400">{result.meta}</div>
                            )}
                          </CardContent>
                        </button>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="relative dark:hover:bg-slate-800">
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600"></span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="dark:hover:bg-slate-800"
        >
          {theme === "dark"
            ? <Sun className="h-5 w-5 text-amber-400" />
            : <Moon className="h-5 w-5 text-slate-600" />
          }
        </Button>
      </div>
    </div>
  )
}
