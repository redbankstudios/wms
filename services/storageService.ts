import { WarehouseZone, Rack, StorageLocation, TenantStorageSummary, PutawaySuggestion } from "@/types";
import { mockZones, mockRacks, mockStorageLocations, mockTenantStorageSummaries, mockPutawaySuggestions } from "@/mock/storage";

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const storageService = {
  async getDashboardStorageSummary(tenantId: string) {
    await delay(250);
    const zones = mockZones.filter(z => z.tenantId === tenantId);
    const racks = mockRacks.filter(r => r.tenantId === tenantId);

    let totalCapacity = 0;
    let usedCapacity = 0;

    zones.forEach(z => {
      totalCapacity += z.totalCapacity;
      usedCapacity += z.usedCapacity;
    });

    const occupancyPercent = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
    const nearCapacityRacks = racks.filter(r => r.totalCapacity > 0 && (r.usedCapacity / r.totalCapacity) >= 0.9).length;

    return {
      totalCapacity,
      usedCapacity,
      occupancyPercent,
      nearCapacityRacks
    };
  },
  async getTopRacksByOccupancy(tenantId: string, limit = 6) {
    await delay(250);
    const racks = mockRacks.filter(r => r.tenantId === tenantId);
    const locations = mockStorageLocations.filter(l => l.tenantId === tenantId);
    const palletsByRack = new Map<string, number>();

    locations.forEach(location => {
      palletsByRack.set(
        location.rackId,
        (palletsByRack.get(location.rackId) ?? 0) + location.currentPallets
      );
    });

    return racks
      .map(rack => {
        const occupancyPercent = rack.totalCapacity > 0
          ? Math.round((rack.usedCapacity / rack.totalCapacity) * 100)
          : 0;
        const palletsStored = palletsByRack.get(rack.id) ?? 0;

        return {
          id: rack.id,
          code: rack.code,
          totalCapacity: rack.totalCapacity,
          usedCapacity: rack.usedCapacity,
          occupancyPercent,
          palletsStored: palletsStored > 0 ? palletsStored : rack.usedCapacity
        };
      })
      .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
      .slice(0, limit);
  },
  async getWarehouseZones(tenantId: string): Promise<WarehouseZone[]> {
    await delay(400);
    return mockZones.filter(z => z.tenantId === tenantId);
  },

  async getRacksByZone(tenantId: string, zoneId: string): Promise<Rack[]> {
    await delay(300);
    return mockRacks.filter(r => r.tenantId === tenantId && r.zoneId === zoneId);
  },

  async getStorageLocationsByRack(tenantId: string, rackId: string): Promise<StorageLocation[]> {
    await delay(200);
    return mockStorageLocations.filter(l => l.tenantId === tenantId && l.rackId === rackId);
  },

  async getStorageSummaryByClient(tenantId: string): Promise<TenantStorageSummary[]> {
    await delay(500);
    // In a real app, this would filter by tenantId (the warehouse operator)
    return mockTenantStorageSummaries;
  },
  async getTopFragmentedClients(tenantId: string, limit = 2): Promise<TenantStorageSummary[]> {
    await delay(350);
    // In a real app, this would filter by tenantId (the warehouse operator)
    const scoreRank: Record<TenantStorageSummary["fragmentationScore"], number> = {
      high: 3,
      medium: 2,
      low: 1
    };
    return [...mockTenantStorageSummaries]
      .sort((a, b) => scoreRank[b.fragmentationScore] - scoreRank[a.fragmentationScore])
      .slice(0, limit);
  },

  async getPutawaySuggestions(tenantId: string): Promise<PutawaySuggestion[]> {
    await delay(300);
    return mockPutawaySuggestions;
  },

  async getOverallStorageMetrics(tenantId: string) {
    await delay(400);
    const zones = mockZones.filter(z => z.tenantId === tenantId);
    
    let totalCapacity = 0;
    let usedCapacity = 0;
    
    zones.forEach(z => {
      totalCapacity += z.totalCapacity;
      usedCapacity += z.usedCapacity;
    });
    
    const occupancyPercent = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
    const emptyLocations = totalCapacity - usedCapacity; // Simplified for demo
    
    // Find overflow usage
    const overflowZone = zones.find(z => z.type === 'overflow');
    const overflowUsage = overflowZone ? overflowZone.usedCapacity : 0;
    
    // Find fragmented tenants
    const fragmentedTenants = mockTenantStorageSummaries.filter(t => t.fragmentationScore === 'high').length;

    return {
      totalCapacity,
      usedCapacity,
      occupancyPercent,
      emptyLocations,
      overflowUsage,
      fragmentedTenants
    };
  },
  async getAllStorageLocations(tenantId: string): Promise<StorageLocation[]> {
    await delay(200);
    return mockStorageLocations.filter(l => l.tenantId === tenantId);
  },
};
