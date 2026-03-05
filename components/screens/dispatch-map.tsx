"use client"

import * as React from "react"
import Map, { Source, Layer, Marker, Popup, NavigationControl, type LayerProps } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import type { DeliveryZone, Order, Driver } from "@/types"
import { haversineKm } from "@/lib/autoAssign"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""

// Generate a circle polygon approximation (N points) for a lat/lng center + radius in km
function circlePolygon(centerLat: number, centerLng: number, radiusKm: number, points = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dLat = (radiusKm / 111.32) * Math.cos(angle)
    const dLng = (radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle)
    coords.push([centerLng + dLng, centerLat + dLat])
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  }
}

interface OrderPin {
  order: Order
  isSelected: boolean
  isAssigned: boolean
  assignedColor?: string
}

interface DispatchMapProps {
  zones: DeliveryZone[]
  orders: Order[]
  selectedOrderId: string | null
  assignedOrderIds: Set<string>
  driverColorByOrderId: Record<string, string>
  onOrderClick: (orderId: string) => void
  drivers: Driver[]
}

export default function DispatchMap({
  zones, orders, selectedOrderId, assignedOrderIds, driverColorByOrderId, onOrderClick, drivers,
}: DispatchMapProps) {
  const [popup, setPopup] = React.useState<{ order: Order; lat: number; lng: number } | null>(null)

  const ordersWithCoords = orders.filter(o => o.deliveryLat != null && o.deliveryLng != null)

  // Build zone GeoJSON feature collection
  const zonesGeoJSON: GeoJSON.FeatureCollection = React.useMemo(() => ({
    type: "FeatureCollection",
    features: zones.map(z => ({
      ...circlePolygon(z.centerLat, z.centerLng, z.radiusKm),
      properties: { color: z.color, name: z.name },
    })),
  }), [zones])

  const zoneFillLayer: LayerProps = {
    id: "zone-fill",
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": 0.12,
    },
  }
  const zoneLineLayer: LayerProps = {
    id: "zone-line",
    type: "line",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2,
      "line-opacity": 0.7,
    },
  }

  // Compute map center from zones centroid or Bay Area default
  const center = React.useMemo(() => {
    if (zones.length === 0) return { lat: 37.34, lng: -121.96 }
    const avgLat = zones.reduce((s, z) => s + z.centerLat, 0) / zones.length
    const avgLng = zones.reduce((s, z) => s + z.centerLng, 0) / zones.length
    return { lat: avgLat, lng: avgLng }
  }, [zones])

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 10 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
    >
      <NavigationControl position="top-right" />

      {/* Zone circles */}
      {zones.length > 0 && (
        <Source id="zones" type="geojson" data={zonesGeoJSON}>
          <Layer {...zoneFillLayer} />
          <Layer {...zoneLineLayer} />
        </Source>
      )}

      {/* Zone center labels */}
      {zones.map(z => (
        <Marker key={`zone-label-${z.id}`} latitude={z.centerLat} longitude={z.centerLng} anchor="center">
          <div
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border pointer-events-none select-none"
            style={{ color: z.color, background: z.color + "22", borderColor: z.color + "66" }}
          >
            {z.name}
          </div>
        </Marker>
      ))}

      {/* Order markers */}
      {ordersWithCoords.map(order => {
        const isSelected = order.id === selectedOrderId
        const isAssigned = assignedOrderIds.has(order.id)
        const pinColor = isAssigned ? (driverColorByOrderId[order.id] ?? "#10b981") : "#6366f1"

        return (
          <Marker
            key={order.id}
            latitude={order.deliveryLat!}
            longitude={order.deliveryLng!}
            anchor="bottom"
            onClick={e => { e.originalEvent.stopPropagation(); setPopup({ order, lat: order.deliveryLat!, lng: order.deliveryLng! }); onOrderClick(order.id) }}
          >
            <div className={`relative cursor-pointer transition-all ${isSelected ? "scale-125" : "hover:scale-110"}`}>
              {/* Pulsing ring for unassigned */}
              {!isAssigned && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: pinColor + "44", transform: "scale(1.8)" }}
                />
              )}
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: pinColor }}
              >
                {order.items}
              </div>
            </div>
          </Marker>
        )
      })}

      {/* Popup */}
      {popup && (
        <Popup
          latitude={popup.lat}
          longitude={popup.lng}
          anchor="bottom"
          offset={20}
          closeButton
          onClose={() => setPopup(null)}
        >
          <div className="text-xs space-y-1 min-w-[150px]">
            <p className="font-semibold font-mono">{popup.order.id}</p>
            <p className="text-slate-600">{popup.order.client}</p>
            <p className="text-slate-500 text-[10px]">{popup.order.destination}</p>
            <p className="text-slate-500">{popup.order.items} packages</p>
          </div>
        </Popup>
      )}
    </Map>
  )
}
