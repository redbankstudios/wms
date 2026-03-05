"use client"

import * as React from "react"
import Map, { Source, Layer, Marker, Popup, NavigationControl, type LayerProps } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import type { DeliveryZone } from "@/types"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""

function circlePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
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

function buildGeoJSON(zoneList: DeliveryZone[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zoneList.map(z => ({
      ...circlePolygon(z.centerLat, z.centerLng, z.radiusKm),
      properties: { color: z.color, name: z.name },
    })),
  }
}

const fillLayer: LayerProps = {
  id: "dz-fill",
  type: "fill",
  paint: { "fill-color": ["get", "color"], "fill-opacity": 0.1 },
}
const lineLayer: LayerProps = {
  id: "dz-line",
  type: "line",
  paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-opacity": 0.7 },
}
const selectedFillLayer: LayerProps = {
  id: "dz-sel-fill",
  type: "fill",
  paint: { "fill-color": ["get", "color"], "fill-opacity": 0.22 },
}
const selectedLineLayer: LayerProps = {
  id: "dz-sel-line",
  type: "line",
  paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 1 },
}

interface DriversZonesMapProps {
  zones: DeliveryZone[]
  selectedZoneId: string | null
  onMapClick: (lat: number, lng: number) => void
  onZoneClick: (zoneId: string) => void
  onZoneEdit: (zone: DeliveryZone) => void
}

export default function DriversZonesMap({
  zones,
  selectedZoneId,
  onMapClick,
  onZoneClick,
  onZoneEdit,
}: DriversZonesMapProps) {
  const [popupZone, setPopupZone] = React.useState<DeliveryZone | null>(null)

  const center = React.useMemo(() => {
    if (zones.length === 0) return { lat: 37.34, lng: -121.96 }
    return {
      lat: zones.reduce((s, z) => s + z.centerLat, 0) / zones.length,
      lng: zones.reduce((s, z) => s + z.centerLng, 0) / zones.length,
    }
  }, [zones])

  const unselectedZones = zones.filter(z => z.id !== selectedZoneId)
  const selectedZone = zones.find(z => z.id === selectedZoneId) ?? null

  const unselectedGeoJSON = React.useMemo(
    () => buildGeoJSON(unselectedZones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zones, selectedZoneId],
  )
  const selectedGeoJSON = React.useMemo(
    () => (selectedZone ? buildGeoJSON([selectedZone]) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zones, selectedZoneId],
  )

  // Close popup if the zone is deleted
  React.useEffect(() => {
    if (popupZone && !zones.find(z => z.id === popupZone.id)) {
      setPopupZone(null)
    }
  }, [zones, popupZone])

  return (
    <div className="w-full h-full relative" style={{ cursor: "crosshair" }}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom: 10 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onClick={e => {
          setPopupZone(null)
          onMapClick(e.lngLat.lat, e.lngLat.lng)
        }}
      >
        <NavigationControl position="top-right" />

        {/* Unselected zones */}
        {unselectedZones.length > 0 && (
          <Source id="dz-unsel" type="geojson" data={unselectedGeoJSON}>
            <Layer {...fillLayer} />
            <Layer {...lineLayer} />
          </Source>
        )}

        {/* Selected zone — rendered on top with stronger style */}
        {selectedGeoJSON && (
          <Source id="dz-sel" type="geojson" data={selectedGeoJSON}>
            <Layer {...selectedFillLayer} />
            <Layer {...selectedLineLayer} />
          </Source>
        )}

        {/* Zone center labels — clickable */}
        {zones.map(z => {
          const isSelected = z.id === selectedZoneId
          const isPopupOpen = popupZone?.id === z.id
          return (
            <Marker
              key={z.id}
              latitude={z.centerLat}
              longitude={z.centerLng}
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation()
                setPopupZone(isPopupOpen ? null : z)
                onZoneClick(z.id)
              }}
            >
              <div
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer select-none transition-all ${
                  isSelected || isPopupOpen ? "scale-110" : "hover:scale-105"
                }`}
                style={{
                  color: z.color,
                  background: z.color + "22",
                  borderColor: isSelected || isPopupOpen ? z.color : z.color + "77",
                  boxShadow:
                    isSelected || isPopupOpen
                      ? `0 0 0 3px ${z.color}33, 0 2px 8px rgba(0,0,0,0.12)`
                      : "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {z.name}
              </div>
            </Marker>
          )
        })}

        {/* Zone edit popup */}
        {popupZone && (
          <Popup
            latitude={popupZone.centerLat}
            longitude={popupZone.centerLng}
            anchor="top"
            offset={24}
            closeButton={false}
            onClose={() => setPopupZone(null)}
            style={{ zIndex: 10 }}
          >
            <div className="min-w-[200px] p-0.5">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="w-3 h-3 rounded-full flex-none"
                  style={{ background: popupZone.color }}
                />
                <span className="font-semibold text-sm text-slate-900 leading-tight flex-1">
                  {popupZone.name}
                </span>
                <button
                  className="text-slate-400 hover:text-slate-600 leading-none text-base font-light ml-1"
                  onClick={e => { e.stopPropagation(); setPopupZone(null) }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Stats */}
              <div className="text-xs text-slate-500 space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>Radius</span>
                  <span className="font-medium text-slate-700">{popupZone.radiusKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Zone ID</span>
                  <span className="font-mono text-slate-600">{popupZone.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Center</span>
                  <span className="font-mono text-slate-600">
                    {popupZone.centerLat.toFixed(4)}, {popupZone.centerLng.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Edit button */}
              <button
                className="w-full text-xs font-semibold px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
                style={{ background: popupZone.color }}
                onClick={e => {
                  e.stopPropagation()
                  onZoneEdit(popupZone)
                  setPopupZone(null)
                }}
              >
                Edit Zone
              </button>
            </div>
          </Popup>
        )}
      </Map>

      {/* Hint overlay */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="text-xs bg-white/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap">
          Click a zone to edit · Click map to add a new zone
        </div>
      </div>
    </div>
  )
}
