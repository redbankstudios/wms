"use client"

import * as React from "react"
import Map, { Source, Layer, Marker, Popup, NavigationControl, type MapRef, type LayerProps } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import { Route, RouteStop, DeliveryZone } from "@/types"

// ─── Zone circle polygon helper ────────────────────────────────────────────────
function circlePolygon(lat: number, lng: number, radiusKm: number, pts = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * 2 * Math.PI
    const dLat = (radiusKm / 111.32) * Math.cos(a)
    const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(a)
    coords.push([lng + dLng, lat + dLat])
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""

const ROUTE_COLORS: Record<string, string> = {
  "RT-842": "#3b82f6",  // blue  — John Doe
  "RT-843": "#8b5cf6",  // purple — Alice Smith
  "RT-840": "#f97316",  // orange — Bob Johnson
  "RT-839": "#10b981",  // emerald — Sarah Williams
}
function routeColor(routeId: string, index: number): string {
  const fallbacks = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#06b6d4"]
  return ROUTE_COLORS[routeId] ?? fallbacks[index % fallbacks.length]
}

// Stop status color
const STOP_STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  next:      "#3b82f6",
  pending:   "#94a3b8",
  issue:     "#ef4444",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DispatcherMapProps {
  routes: Route[]
  routeStops: Record<string, RouteStop[]>
  selectedDriverId: string | null
  onDriverSelect: (driverId: string) => void
  zones?: DeliveryZone[]
}

interface PopupInfo {
  type: "driver" | "stop"
  lat: number
  lng: number
  // driver popup
  driverName?: string
  routeId?: string
  progress?: string
  status?: string
  // stop popup
  customer?: string
  address?: string
  time?: string
  stopStatus?: string
  packages?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stopsToGeoJSON(stops: RouteStop[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: stops
        .filter(s => s.lat != null && s.lng != null)
        .map(s => [s.lng!, s.lat!]),
    },
  }
}

/** Find the driver's current estimated position: first "next" stop, else last "completed", else first stop */
function driverPosition(stops: RouteStop[]): RouteStop | null {
  const next = stops.find(s => s.status === "next")
  if (next?.lat) return next
  const completed = [...stops].reverse().find(s => s.status === "completed")
  if (completed?.lat) return completed
  return stops.find(s => s.lat != null) ?? null
}

function fitBoundsFromStops(stops: RouteStop[]): [[number, number], [number, number]] | null {
  const pts = stops.filter(s => s.lat != null && s.lng != null)
  if (pts.length === 0) return null
  const lngs = pts.map(s => s.lng!)
  const lats = pts.map(s => s.lat!)
  return [
    [Math.min(...lngs) - 0.02, Math.min(...lats) - 0.02],
    [Math.max(...lngs) + 0.02, Math.max(...lats) + 0.02],
  ]
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DispatcherMap({ routes, routeStops, selectedDriverId, onDriverSelect, zones = [] }: DispatcherMapProps) {
  const mapRef = React.useRef<MapRef>(null)
  const [popupInfo, setPopupInfo] = React.useState<PopupInfo | null>(null)
  const [mapLoaded, setMapLoaded] = React.useState(false)

  // Active routes — those with stops
  const activeRoutes = routes.filter(r => r.status !== "available" && (routeStops[r.id]?.length ?? 0) > 0)
  const selectedRoute = selectedDriverId
    ? activeRoutes.find(r => r.driverId === selectedDriverId)
    : null

  // Fit map to selected route when it changes
  React.useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const targetRoute = selectedRoute ?? activeRoutes[0]
    if (!targetRoute) return
    const stops = routeStops[targetRoute.id] ?? []
    const bounds = fitBoundsFromStops(stops)
    if (!bounds) return
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 14 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId, mapLoaded])

  // Fit all routes on initial load
  React.useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const allStops = Object.values(routeStops).flat()
    const bounds = fitBoundsFromStops(allStops)
    if (!bounds) return
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 13 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded])

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "pk.PASTE_YOUR_TOKEN_HERE") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 rounded-lg text-center p-8 gap-3">
        <div className="text-4xl">🗺️</div>
        <p className="font-semibold text-slate-700">Mapbox token not configured</p>
        <p className="text-sm text-slate-500 max-w-xs">
          Add your token to <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">.env.local</code>:
          <br /><code className="bg-slate-200 px-1 py-0.5 rounded text-xs mt-1 block">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx</code>
        </p>
      </div>
    )
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{ longitude: -121.95, latitude: 37.36, zoom: 11 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      onLoad={() => setMapLoaded(true)}
      onClick={() => setPopupInfo(null)}
    >
      <NavigationControl position="top-right" />

      {/* ── Delivery zone circles ── */}
      {zones.map(z => (
        <Source key={`zone-${z.id}`} id={`zone-${z.id}`} type="geojson" data={{
          type: "FeatureCollection",
          features: [{ ...circlePolygon(z.centerLat, z.centerLng, z.radiusKm), properties: { color: z.color } }],
        }}>
          <Layer id={`zone-fill-${z.id}`} type="fill" paint={{ "fill-color": z.color, "fill-opacity": 0.08 }} />
          <Layer id={`zone-line-${z.id}`} type="line" paint={{ "line-color": z.color, "line-width": 1.5, "line-opacity": 0.5 }} />
        </Source>
      ))}

      {/* ── Route polylines ── */}
      {activeRoutes.map((route, idx) => {
        const stops = routeStops[route.id] ?? []
        const color = routeColor(route.id, idx)
        const isSelected = selectedRoute?.id === route.id
        const geoJSON = stopsToGeoJSON(stops)

        const layerStyle: LayerProps = {
          id: `route-line-${route.id}`,
          type: "line",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": color,
            "line-width": isSelected ? 4 : 2,
            "line-opacity": isSelected ? 1 : 0.45,
            "line-dasharray": [1, 0],
          },
        }

        return (
          <React.Fragment key={route.id}>
            <Source id={`route-source-${route.id}`} type="geojson" data={geoJSON}>
              <Layer {...layerStyle} />
            </Source>
            {/* Halo for selected route */}
            {isSelected && (
              <Source id={`route-halo-${route.id}`} type="geojson" data={geoJSON}>
                <Layer
                  id={`route-halo-layer-${route.id}`}
                  type="line"
                  layout={{ "line-join": "round", "line-cap": "round" }}
                  paint={{ "line-color": color, "line-width": 10, "line-opacity": 0.15 }}
                />
              </Source>
            )}
          </React.Fragment>
        )
      })}

      {/* ── Stop markers ── */}
      {activeRoutes.map((route, idx) => {
        const stops = routeStops[route.id] ?? []
        const color = routeColor(route.id, idx)
        const isSelected = selectedRoute?.id === route.id || !selectedRoute

        return stops
          .filter(s => s.lat != null && s.lng != null)
          .map((stop, stopIdx) => {
            const stopColor = STOP_STATUS_COLORS[stop.status] ?? "#94a3b8"
            return (
              <Marker
                key={stop.id}
                longitude={stop.lng!}
                latitude={stop.lat!}
                anchor="center"
                onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
                  e.originalEvent.stopPropagation()
                  setPopupInfo({
                    type: "stop",
                    lat: stop.lat!,
                    lng: stop.lng!,
                    customer: stop.customer,
                    address: stop.address,
                    time: stop.time,
                    stopStatus: stop.status,
                    packages: stop.packages,
                  })
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: stopColor,
                    border: "2px solid white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "white",
                    cursor: "pointer",
                    opacity: isSelected ? 1 : 0.5,
                    transition: "opacity 0.2s",
                    outline: isSelected && selectedRoute?.id === route.id ? `2px solid ${color}` : "none",
                    outlineOffset: 1,
                  }}
                  title={stop.customer}
                >
                  {stopIdx + 1}
                </div>
              </Marker>
            )
          })
      })}

      {/* ── Driver markers ── */}
      {activeRoutes.map((route, idx) => {
        const stops = routeStops[route.id] ?? []
        const driverPos = driverPosition(stops)
        if (!driverPos) return null
        const color = routeColor(route.id, idx)
        const isSelected = selectedRoute?.id === route.id
        const isActive = route.status === "on_route"

        return (
          <Marker
            key={`driver-${route.id}`}
            longitude={driverPos.lng!}
            latitude={driverPos.lat!}
            anchor="center"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation()
              onDriverSelect(route.driverId)
              setPopupInfo({
                type: "driver",
                lat: driverPos.lat!,
                lng: driverPos.lng!,
                driverName: route.driverName,
                routeId: route.id,
                progress: route.progress,
                status: route.status,
              })
            }}
          >
            <div style={{ position: "relative", width: 32, height: 32, cursor: "pointer" }}>
              {/* Pulse ring (active drivers only) */}
              {isActive && (
                <span
                  style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: color, opacity: 0.3,
                    animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
              )}
              {/* Driver dot */}
              <div
                style={{
                  position: "absolute", inset: 4, borderRadius: "50%",
                  background: color,
                  border: isSelected ? "3px solid white" : "2px solid white",
                  boxShadow: isSelected
                    ? `0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.4)`
                    : "0 1px 4px rgba(0,0,0,0.3)",
                  transition: "box-shadow 0.2s",
                }}
              />
            </div>
          </Marker>
        )
      })}

      {/* ── Popup ── */}
      {popupInfo && (
        <Popup
          longitude={popupInfo.lng}
          latitude={popupInfo.lat}
          anchor="bottom"
          offset={16}
          closeOnClick={false}
          onClose={() => setPopupInfo(null)}
          style={{ maxWidth: 240 }}
        >
          {popupInfo.type === "driver" ? (
            <div className="p-2 space-y-1 text-sm">
              <div className="font-semibold text-slate-900">{popupInfo.driverName}</div>
              <div className="text-xs text-slate-500 font-mono">{popupInfo.routeId}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                  style={{
                    background: popupInfo.status === "on_route" ? "#dbeafe" : "#fef3c7",
                    color: popupInfo.status === "on_route" ? "#1d4ed8" : "#92400e",
                  }}
                >
                  {popupInfo.status?.replace("_", " ")}
                </span>
                <span className="text-xs text-slate-600">{popupInfo.progress} stops</span>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1 text-sm">
              <div className="font-semibold text-slate-900">{popupInfo.customer}</div>
              <div className="text-xs text-slate-500">{popupInfo.address}</div>
              <div className="text-xs text-slate-500">{popupInfo.time}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                  style={{
                    background: popupInfo.stopStatus === "completed" ? "#d1fae5"
                      : popupInfo.stopStatus === "next" ? "#dbeafe"
                      : popupInfo.stopStatus === "issue" ? "#fee2e2"
                      : "#f1f5f9",
                    color: popupInfo.stopStatus === "completed" ? "#065f46"
                      : popupInfo.stopStatus === "next" ? "#1d4ed8"
                      : popupInfo.stopStatus === "issue" ? "#991b1b"
                      : "#475569",
                  }}
                >
                  {popupInfo.stopStatus}
                </span>
                <span className="text-xs text-slate-600">{popupInfo.packages} pkg</span>
              </div>
            </div>
          )}
        </Popup>
      )}

      {/* Tailwind keyframe for pulse — injected inline since Tailwind purges unused */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </Map>
  )
}
