import { DeliveryZone } from "../types"
import { mockZones } from "../mock/zones"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let zonesStore: DeliveryZone[] = [...mockZones]

export const zoneService = {
  async getZonesByTenant(tenantId: string): Promise<DeliveryZone[]> {
    await delay(200)
    return zonesStore.filter(z => z.tenantId === tenantId)
  },

  async createZone(zone: Omit<DeliveryZone, "id"> & { tenantId: string }): Promise<DeliveryZone> {
    await delay(200)
    const newZone: DeliveryZone = { ...zone, id: `DZ-${Date.now()}` }
    zonesStore = [...zonesStore, newZone]
    return newZone
  },

  async updateZone(zoneId: string, updates: Partial<DeliveryZone>): Promise<DeliveryZone> {
    await delay(200)
    zonesStore = zonesStore.map(z => z.id === zoneId ? { ...z, ...updates } : z)
    const updated = zonesStore.find(z => z.id === zoneId)
    if (!updated) throw new Error(`Zone ${zoneId} not found`)
    return updated
  },

  async deleteZone(zoneId: string): Promise<void> {
    await delay(200)
    zonesStore = zonesStore.filter(z => z.id !== zoneId)
  },
}
