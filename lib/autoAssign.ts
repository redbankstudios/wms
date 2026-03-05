import type { Driver, DeliveryZone, Vehicle } from "@/types"

export interface Coords { lat: number; lng: number }

export interface DriverLoad {
  stopCount: number   // stops already assigned to this driver's current route
  weightKg: number    // total kg already loaded
  packages: number    // total packages already loaded
}

export interface AssignmentResult {
  driver: Driver
  reason: "zone_match" | "overflow"
  remainingCapacityPct: number  // 0–100; lowest of (stops/weight/packages) remaining pct
}

/** Haversine distance in km between two lat/lng points */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const chord =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
}

/**
 * Returns the remaining capacity percentage for a driver/vehicle pair.
 * 100 = completely empty, 0 = full on at least one dimension.
 */
function remainingPct(
  driver: Driver,
  vehicle: Vehicle | undefined,
  load: DriverLoad,
  newWeightKg: number,
  newPackages: number
): number {
  const stopPct = driver.maxStops > 0
    ? ((driver.maxStops - load.stopCount) / driver.maxStops) * 100
    : 100

  if (!vehicle) return stopPct

  const weightPct =
    ((vehicle.maxWeightKg - load.weightKg - newWeightKg) / vehicle.maxWeightKg) * 100
  const pkgPct =
    ((vehicle.maxPackages - load.packages - newPackages) / vehicle.maxPackages) * 100

  return Math.min(stopPct, weightPct, pkgPct)
}

/**
 * Returns true if the driver/vehicle can accept this order without exceeding any limit.
 */
function canAccept(
  driver: Driver,
  vehicle: Vehicle | undefined,
  load: DriverLoad,
  newWeightKg: number,
  newPackages: number
): boolean {
  if (load.stopCount >= driver.maxStops) return false
  if (!vehicle) return true
  if (load.weightKg + newWeightKg > vehicle.maxWeightKg) return false
  if (load.packages + newPackages > vehicle.maxPackages) return false
  return true
}

/**
 * Auto-assign an order to the best available driver.
 *
 * Algorithm:
 *  1. Find zones whose circle contains the delivery point.
 *  2. Among drivers assigned to matching zones, pick the eligible one with most remaining capacity.
 *  3. Overflow: if no zone match, pick the nearest driver (by zone centroid distance) with capacity.
 *  4. Returns null if every driver is at capacity.
 */
export function autoAssignDriver(
  deliveryCoords: Coords,
  orderWeightKg: number,
  orderPackages: number,
  zones: DeliveryZone[],
  drivers: Driver[],
  vehicles: Vehicle[],
  driverLoads: Record<string, DriverLoad>
): AssignmentResult | null {
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]))

  const eligible = (driver: Driver) =>
    canAccept(
      driver,
      driver.vehicleId ? vehicleMap[driver.vehicleId] : undefined,
      driverLoads[driver.id] ?? { stopCount: 0, weightKg: 0, packages: 0 },
      orderWeightKg,
      orderPackages
    )

  const remaining = (driver: Driver) =>
    remainingPct(
      driver,
      driver.vehicleId ? vehicleMap[driver.vehicleId] : undefined,
      driverLoads[driver.id] ?? { stopCount: 0, weightKg: 0, packages: 0 },
      orderWeightKg,
      orderPackages
    )

  // ── Primary: zone match ────────────────────────────────────────────────────
  const matchingZoneIds = new Set(
    zones
      .filter(z =>
        haversineKm(deliveryCoords, { lat: z.centerLat, lng: z.centerLng }) <= z.radiusKm
      )
      .map(z => z.id)
  )

  const zoneDrivers = drivers.filter(
    d => d.zoneId && matchingZoneIds.has(d.zoneId) && eligible(d)
  )

  if (zoneDrivers.length > 0) {
    const best = zoneDrivers.sort((a, b) => remaining(b) - remaining(a))[0]
    return { driver: best, reason: "zone_match", remainingCapacityPct: remaining(best) }
  }

  // ── Overflow: nearest driver with capacity ─────────────────────────────────
  const availableDrivers = drivers.filter(eligible)
  if (availableDrivers.length === 0) return null

  const nearest = availableDrivers.sort((a, b) => {
    const zoneA = zones.find(z => z.id === a.zoneId)
    const zoneB = zones.find(z => z.id === b.zoneId)
    const distA = zoneA
      ? haversineKm(deliveryCoords, { lat: zoneA.centerLat, lng: zoneA.centerLng })
      : Infinity
    const distB = zoneB
      ? haversineKm(deliveryCoords, { lat: zoneB.centerLat, lng: zoneB.centerLng })
      : Infinity
    return distA - distB
  })[0]

  return { driver: nearest, reason: "overflow", remainingCapacityPct: remaining(nearest) }
}
