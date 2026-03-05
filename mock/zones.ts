import { DeliveryZone } from "../types"

export const mockZones: DeliveryZone[] = [
  { id: "DZ-001", tenantId: "tenant-1", locationId: "LOC-001", name: "Downtown SJ",  centerLat: 37.3382, centerLng: -121.8863, radiusKm: 8,  color: "#ef4444", description: "Downtown San Jose core area" },
  { id: "DZ-002", tenantId: "tenant-1", locationId: "LOC-001", name: "South Bay",    centerLat: 37.2871, centerLng: -121.9500, radiusKm: 15, color: "#3b82f6", description: "Campbell, Milpitas, Santa Clara" },
  { id: "DZ-003", tenantId: "tenant-1", locationId: "LOC-001", name: "Peninsula",    centerLat: 37.4022, centerLng: -122.0957, radiusKm: 20, color: "#8b5cf6", description: "Palo Alto, Mountain View, Sunnyvale, Cupertino" },
  { id: "DZ-004", tenantId: "tenant-1", locationId: "LOC-001", name: "East Bay",     centerLat: 37.4323, centerLng: -121.8996, radiusKm: 18, color: "#10b981", description: "Milpitas, Fremont, Newark" },
]
