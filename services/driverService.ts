import { Driver } from "../types"
import { mockDrivers } from "../mock/drivers"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// In-memory store (mock mutations)
let driversStore: Driver[] = [...mockDrivers]

export const driverService = {
  async getDriversByTenant(tenantId: string): Promise<Driver[]> {
    await delay(200)
    return driversStore.filter(d => d.tenantId === tenantId)
  },

  async createDriver(driver: Omit<Driver, "id"> & { tenantId: string }): Promise<Driver> {
    await delay(200)
    const newDriver: Driver = { ...driver, id: `DRV-${Date.now()}` }
    driversStore = [...driversStore, newDriver]
    return newDriver
  },

  async updateDriver(driverId: string, updates: Partial<Driver>): Promise<Driver> {
    await delay(200)
    driversStore = driversStore.map(d => d.id === driverId ? { ...d, ...updates } : d)
    const updated = driversStore.find(d => d.id === driverId)
    if (!updated) throw new Error(`Driver ${driverId} not found`)
    return updated
  },

  async deleteDriver(driverId: string): Promise<void> {
    await delay(200)
    driversStore = driversStore.filter(d => d.id !== driverId)
  },
}
