"use client"

import * as React from "react"
import Map, { Source, Layer, Marker, Popup, NavigationControl, type MapRef, type LayerProps } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import { RouteStop } from "@/types"
import { MapPin, Package, AlertCircle, CheckCircle2 } from "lucide-react"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""

// Status colours
const STATUS_BG: Record<string, string> = {
  completed: "#10b981",
  next:      "#3b82f6",
  issue:     "#ef4444",
  pending:   "#94a3b8",
}
const STATUS_RING: Record<string, string> = {
  completed: "#059669",
  next:      "#2563eb",
  issue:     "#dc2626",
  pending:   "#64748b",
}

interface Props {
  stops: RouteStop[]
  onStopSelect: (stop: RouteStop) => void
}

export function MobileDriverMap({ stops, onStopSelect }: Props) {
  const mapRef = React.useRef<MapRef>(null)
  const [popupStop, setPopupStop] = React.useState<RouteStop | null>(null)

  const stopsWithCoords = React.useMemo(
    () => stops.filter(s => s.lat != null && s.lng != null),
    [stops]
  )
  const missingCoords = stops.length - stopsWithCoords.length

  // Build route polyline GeoJSON
  const routeLine = React.useMemo((): GeoJSON.Feature<GeoJSON.LineString> => ({
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: stopsWithCoords.map(s => [s.lng!, s.lat!]),
    },
  }), [stopsWithCoords])

  const lineLayer: LayerProps = {
    id: "route-line",
    type: "line",
    paint: {
      "line-color": "#3b82f6",
      "line-width": 2.5,
      "line-dasharray": [3, 2],
      "line-opacity": 0.7,
    },
  }

  // Auto-fit bounds on load
  React.useEffect(() => {
    if (stopsWithCoords.length === 0) return
    const lngs = stopsWithCoords.map(s => s.lng!)
    const lats = stopsWithCoords.map(s => s.lat!)
    const map = mapRef.current?.getMap()
    if (!map) return
    map.fitBounds(
      [[Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01],
       [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01]],
      { padding: 48, duration: 600 }
    )
  }, [stopsWithCoords])

  if (stopsWithCoords.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
        <MapPin className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-600">No GPS coordinates available</p>
        <p className="text-xs text-slate-400 mt-1">Stops don&apos;t have location data yet.</p>
      </div>
    )
  }

  const center = stopsWithCoords[0]

  return (
    <div className="flex-1 relative overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center.lng!,
          latitude: center.lat!,
          zoom: 12,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Route polyline */}
        {stopsWithCoords.length >= 2 && (
          <Source id="route" type="geojson" data={routeLine}>
            <Layer {...lineLayer} />
          </Source>
        )}

        {/* Stop markers */}
        {stopsWithCoords.map((stop, idx) => (
          <Marker
            key={stop.id}
            longitude={stop.lng!}
            latitude={stop.lat!}
            anchor="center"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation()
              setPopupStop(prev => prev?.id === stop.id ? null : stop)
            }}
          >
            <div
              className="relative cursor-pointer transition-transform active:scale-90"
              style={{ transform: popupStop?.id === stop.id ? "scale(1.15)" : "scale(1)" }}
            >
              {/* Pulse ring for "next" stop */}
              {stop.status === "next" && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ backgroundColor: STATUS_BG["next"], margin: "-4px" }}
                />
              )}
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-md"
                style={{
                  backgroundColor: STATUS_BG[stop.status] ?? STATUS_BG.pending,
                  border: `2px solid ${STATUS_RING[stop.status] ?? STATUS_RING.pending}`,
                }}
              >
                {stop.status === "completed"
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : stop.status === "issue"
                  ? <AlertCircle className="h-3.5 w-3.5" />
                  : <span>{idx + 1}</span>
                }
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupStop && (
          <Popup
            longitude={popupStop.lng!}
            latitude={popupStop.lat!}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            offset={18}
            onClose={() => setPopupStop(null)}
          >
            <div className="p-2 min-w-[160px]">
              <p className="font-bold text-slate-900 text-sm leading-tight mb-0.5">{popupStop.customer}</p>
              <p className="text-[10px] text-slate-500 mb-2 leading-tight">{popupStop.address}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-[10px] text-slate-500">
                  <Package className="h-3 w-3 mr-1" />{popupStop.packages} pkg
                </span>
                {popupStop.status !== "completed" && (
                  <button
                    className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md transition-colors"
                    onClick={() => { setPopupStop(null); onStopSelect(popupStop) }}
                  >
                    Open Stop
                  </button>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Missing coords notice */}
      {missingCoords > 0 && (
        <div className="absolute bottom-3 left-3 right-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-700 flex items-center">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          {missingCoords} stop{missingCoords > 1 ? "s" : ""} without GPS data not shown.
        </div>
      )}
    </div>
  )
}
