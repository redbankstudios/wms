"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin, Navigation, Clock, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Truck, User,
} from "lucide-react"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import type { Route, RouteStop, DeliveryZone } from "@/types"
import type { RouteException } from "@/data/providers/IDataProvider"

// Dynamic import — Mapbox must not run on the server
const DispatcherMap = dynamic(() => import("./dispatcher-map"), { ssr: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default"
  if (status === "on_route" || status === "dispatched") return "secondary"
  return "outline"
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase()
}

function stopStatusColor(status: RouteStop["status"]) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500",
    next:      "bg-blue-500",
    pending:   "bg-slate-300",
    issue:     "bg-red-500",
  }
  return map[status] ?? "bg-slate-300"
}

// ─── Stop Row (inside expanded card) ─────────────────────────────────────────

function StopRow({ stop, idx }: { stop: RouteStop; idx: number }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className={`mt-0.5 flex-none w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${stopStatusColor(stop.status)}`}>
        {stop.status === "completed" ? "✓" : idx + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{stop.customer}</p>
        <p className="text-[11px] text-slate-500 truncate">{stop.address}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
          <span>{stop.time}</span>
          <span>·</span>
          <span>{stop.packages} pkg</span>
          {stop.notes && (
            <>
              <span>·</span>
              <span className="text-amber-500 truncate">{stop.notes}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Route Card ───────────────────────────────────────────────────────────────

interface RouteCardProps {
  route: Route
  stops: RouteStop[]
  exceptionCount: number
  isSelected: boolean
  onSelect: () => void
  onDispatch: (e: React.MouseEvent) => void
  localStatus: Route["status"] | null
}

function RouteCard({ route, stops, exceptionCount, isSelected, onSelect, onDispatch, localStatus }: RouteCardProps) {
  const [completed, total] = (route.progress || "0/0").split("/").map(Number)
  const displayStatus = localStatus ?? route.status
  const eta = route.shift?.split("-")[1]?.trim() ?? "--"
  const canDispatch = displayStatus === "planned" || displayStatus === "available"

  const borderClass = isSelected
    ? "border-blue-500 ring-2 ring-blue-200"
    : displayStatus === "on_route" || displayStatus === "dispatched"
    ? "border-l-4 border-l-blue-400"
    : ""

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-slate-400 ${borderClass}`}
      onClick={onSelect}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-mono">{route.id}</CardTitle>
          <Badge variant={statusVariant(displayStatus)} className="text-[10px]">
            {statusLabel(displayStatus)}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 text-xs">
          <User className="h-3 w-3" />
          {route.driverName}
          {route.vehicleId && route.vehicleId !== "Unassigned" && (
            <>
              <span className="text-slate-300 mx-1">·</span>
              <Truck className="h-3 w-3" />
              {route.vehicleId}
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-2">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {completed}/{total} stops
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ETA {eta}
            </div>
          </div>
          {total > 0 && (
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.round((completed / total) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Exception / completed badges */}
        {exceptionCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
            <AlertTriangle className="h-3 w-3 flex-none" />
            {exceptionCount} exception{exceptionCount > 1 ? "s" : ""}
          </div>
        )}
        {displayStatus === "completed" && (
          <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
            <CheckCircle2 className="h-3 w-3" />
            All stops completed
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-1">
          {canDispatch ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={onDispatch}
            >
              <Navigation className="h-3 w-3 mr-1" />
              Dispatch
            </Button>
          ) : (
            <span />
          )}
          <button
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); onSelect() }}
          >
            {stops.length} stops
            {isSelected ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded stop list */}
        {isSelected && stops.length > 0 && (
          <div className="border-t border-slate-100 pt-2 space-y-0.5 max-h-56 overflow-y-auto">
            {stops.map((stop, idx) => (
              <StopRow key={stop.id} stop={stop} idx={idx} />
            ))}
          </div>
        )}

        {isSelected && stops.length === 0 && (
          <div className="border-t border-slate-100 pt-2 text-xs text-slate-400 text-center py-2">
            No stops assigned
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function RouteBoard() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [routes, setRoutes] = React.useState<Route[]>([])
  const [allRouteStops, setAllRouteStops] = React.useState<Record<string, RouteStop[]>>({})
  const [exceptions, setExceptions] = React.useState<RouteException[]>([])
  const [zones, setZones] = React.useState<DeliveryZone[]>([])
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null)
  // Local dispatch overrides (not persisted — for demo UX)
  const [dispatched, setDispatched] = React.useState<Set<string>>(new Set())

  // ── Resolve tenant ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    async function resolve() {
      if (selectedTenant?.id) { setTenantId(selectedTenant.id); return }
      const tenants = await api.tenants.getTenants()
      setTenantId(tenants[0]?.id ?? null)
    }
    resolve()
  }, [api, selectedTenant?.id])

  // ── Load data ───────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!tenantId) return
    async function loadData() {
      const [routeData, exceptionData, zoneData] = await Promise.all([
        api.routes.getRoutesByTenant(tenantId!),
        api.routes.getExceptions(tenantId!),
        api.zones.getZonesByTenant(tenantId!),
      ])
      setRoutes(routeData)
      setExceptions(exceptionData)
      setZones(zoneData)

      // Load stops for every route in parallel
      const stopsRecord: Record<string, RouteStop[]> = {}
      await Promise.all(
        routeData.map(async (route) => {
          stopsRecord[route.id] = await api.routes.getRouteStops(route.id)
        })
      )
      setAllRouteStops(stopsRecord)
    }
    loadData()
  }, [api, tenantId])

  // ── Derived state ───────────────────────────────────────────────────────────
  const exceptionsByRoute = React.useMemo(
    () =>
      exceptions.reduce<Record<string, number>>((acc, ex) => {
        if (ex.routeId) acc[ex.routeId] = (acc[ex.routeId] ?? 0) + 1
        return acc
      }, {}),
    [exceptions]
  )

  // The DispatcherMap expects selectedDriverId
  const selectedDriverId = React.useMemo(
    () => routes.find(r => r.id === selectedRouteId)?.driverId ?? null,
    [routes, selectedRouteId]
  )

  const activeRouteCount = routes.filter(r => r.status === "on_route" || r.status === "dispatched").length
  const openExceptionCount = exceptions.filter(e => e.status === "open").length

  function handleDispatch(routeId: string) {
    setDispatched(prev => new Set(prev).add(routeId))
  }

  function toggleRoute(routeId: string) {
    setSelectedRouteId(prev => (prev === routeId ? null : routeId))
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-none">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Route Board</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {activeRouteCount} active &nbsp;·&nbsp; {routes.length} total &nbsp;·&nbsp;
            {openExceptionCount > 0
              ? <span className="text-amber-600 font-medium">{openExceptionCount} open exception{openExceptionCount > 1 ? "s" : ""}</span>
              : <span>no exceptions</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Navigation className="mr-2 h-4 w-4" />
            Plan Routes
          </Button>
          <Button
            onClick={() => {
              const dispatchable = routes.filter(r => r.status === "planned" || r.status === "available")
              setDispatched(new Set(dispatchable.map(r => r.id)))
            }}
          >
            Dispatch All
          </Button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-4 md:grid-cols-3 flex-1 min-h-0">
        {/* ── Route list ── */}
        <div className="col-span-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-none">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Routes</span>
            <Badge variant="secondary">{routes.length}</Badge>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {routes.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-8">Loading routes…</div>
            )}
            {routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                stops={allRouteStops[route.id] ?? []}
                exceptionCount={exceptionsByRoute[route.id] ?? 0}
                isSelected={selectedRouteId === route.id}
                localStatus={dispatched.has(route.id) ? "dispatched" : null}
                onSelect={() => toggleRoute(route.id)}
                onDispatch={(e) => { e.stopPropagation(); handleDispatch(route.id) }}
              />
            ))}
          </div>
        </div>

        {/* ── Map ── */}
        <div className="col-span-2 rounded-xl border border-slate-200 overflow-hidden min-h-0 relative shadow-sm">
          {/* Legend */}
          <div className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />Completed</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" />Next stop</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-slate-300" />Pending</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Issue</span>
          </div>

          <DispatcherMap
            routes={routes}
            routeStops={allRouteStops}
            selectedDriverId={selectedDriverId}
            zones={zones}
            onDriverSelect={(driverId) => {
              const route = routes.find(r => r.driverId === driverId)
              if (route) toggleRoute(route.id)
            }}
          />
        </div>
      </div>
    </div>
  )
}
