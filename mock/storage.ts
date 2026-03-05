import { WarehouseZone, Rack, StorageLocation, StorageOccupancy, TenantStorageSummary, PutawaySuggestion } from "@/types";

export const mockZones: WarehouseZone[] = [
  { id: "Z-01", tenantId: "tenant-1", warehouseId: "WH-01", name: "Reserve Storage", type: "reserve", color: "blue", totalCapacity: 1200, usedCapacity: 950 },
  { id: "Z-02", tenantId: "tenant-1", warehouseId: "WH-01", name: "Forward Pick", type: "forward_pick", color: "emerald", totalCapacity: 400, usedCapacity: 320 },
  { id: "Z-03", tenantId: "tenant-1", warehouseId: "WH-01", name: "Overflow", type: "overflow", color: "amber", totalCapacity: 300, usedCapacity: 280 },
  { id: "Z-04", tenantId: "tenant-1", warehouseId: "WH-01", name: "Returns", type: "returns", color: "red", totalCapacity: 100, usedCapacity: 85 },
  { id: "Z-05", tenantId: "tenant-1", warehouseId: "WH-01", name: "Staging", type: "staging", color: "slate", totalCapacity: 200, usedCapacity: 50 },
];

export const mockRacks: Rack[] = [
  // Reserve Storage Racks
  { id: "R-01", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", code: "R-01", side: "A", levelCount: 5, bayCount: 10, totalCapacity: 100, usedCapacity: 95, preferredClientId: "C-101" },
  { id: "R-02", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", code: "R-02", side: "B", levelCount: 5, bayCount: 10, totalCapacity: 100, usedCapacity: 100, preferredClientId: "C-101" },
  { id: "R-03", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", code: "R-03", side: "A", levelCount: 5, bayCount: 10, totalCapacity: 100, usedCapacity: 40, preferredClientId: "C-102" },
  { id: "R-04", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", code: "R-04", side: "B", levelCount: 5, bayCount: 10, totalCapacity: 100, usedCapacity: 80 },
  // Forward Pick Racks
  { id: "R-05", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-02", code: "FP-01", side: "A", levelCount: 3, bayCount: 15, totalCapacity: 90, usedCapacity: 85 },
  { id: "R-06", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-02", code: "FP-02", side: "B", levelCount: 3, bayCount: 15, totalCapacity: 90, usedCapacity: 70 },
  // Overflow Racks
  { id: "R-07", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-03", code: "OV-01", side: "A", levelCount: 4, bayCount: 10, totalCapacity: 80, usedCapacity: 78 },
  // Returns Racks
  { id: "R-08", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-04", code: "RT-01", side: "A", levelCount: 2, bayCount: 5, totalCapacity: 20, usedCapacity: 18 },
];

export const mockStorageLocations: StorageLocation[] = [
  // Locations for Rack R-01 (mostly full, grouped for C-101)
  { id: "L-001", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-01", code: "R-01-A-1-1", level: 1, bay: 1, type: "pallet", maxPallets: 2, currentPallets: 2, utilizationPercent: 100, assignedClientId: "C-101" },
  { id: "L-002", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-01", code: "R-01-A-1-2", level: 1, bay: 2, type: "pallet", maxPallets: 2, currentPallets: 2, utilizationPercent: 100, assignedClientId: "C-101" },
  { id: "L-003", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-01", code: "R-01-A-1-3", level: 1, bay: 3, type: "pallet", maxPallets: 2, currentPallets: 1, utilizationPercent: 50, assignedClientId: "C-101" },
  { id: "L-004", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-01", code: "R-01-A-2-1", level: 2, bay: 1, type: "pallet", maxPallets: 2, currentPallets: 2, utilizationPercent: 100, assignedClientId: "C-101" },
  { id: "L-005", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-01", code: "R-01-A-2-2", level: 2, bay: 2, type: "pallet", maxPallets: 2, currentPallets: 0, utilizationPercent: 0 },
  
  // Locations for Rack R-03 (partially empty, mixed)
  { id: "L-006", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-03", code: "R-03-A-1-1", level: 1, bay: 1, type: "pallet", maxPallets: 2, currentPallets: 2, utilizationPercent: 100, assignedClientId: "C-102" },
  { id: "L-007", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-03", code: "R-03-A-1-2", level: 1, bay: 2, type: "pallet", maxPallets: 2, currentPallets: 1, utilizationPercent: 50, assignedClientId: "C-103" }, // Fragmented client
  { id: "L-008", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-01", rackId: "R-03", code: "R-03-A-1-3", level: 1, bay: 3, type: "pallet", maxPallets: 2, currentPallets: 0, utilizationPercent: 0 },
  
  // Locations for Rack R-07 (Overflow)
  { id: "L-009", tenantId: "tenant-1", warehouseId: "WH-01", zoneId: "Z-03", rackId: "R-07", code: "OV-01-A-1-1", level: 1, bay: 1, type: "pallet", maxPallets: 2, currentPallets: 2, utilizationPercent: 100, assignedClientId: "C-103" }, // Fragmented client in overflow
];

export const mockTenantStorageSummaries: TenantStorageSummary[] = [
  { clientId: "C-101", clientName: "TechCorp", palletsStored: 450, zonesUsed: 2, racksUsed: 5, fragmentationScore: "low", preferredZone: "Reserve Storage", utilizationPercent: 92 },
  { clientId: "C-102", clientName: "FitLife", palletsStored: 120, zonesUsed: 1, racksUsed: 2, fragmentationScore: "low", preferredZone: "Reserve Storage", utilizationPercent: 85 },
  { clientId: "C-103", clientName: "BeanRoasters", palletsStored: 340, zonesUsed: 4, racksUsed: 12, fragmentationScore: "high", preferredZone: "Reserve Storage", utilizationPercent: 60 }, // Highly fragmented
  { clientId: "C-104", clientName: "HomeGoods", palletsStored: 210, zonesUsed: 2, racksUsed: 4, fragmentationScore: "medium", preferredZone: "Forward Pick", utilizationPercent: 78 },
];

export const mockPutawaySuggestions: PutawaySuggestion[] = [
  { id: "S-01", type: "consolidation", message: "BeanRoasters is split across 12 racks; consolidate into Zone A (Reserve).", priority: "high", actionLabel: "View Consolidation Plan" },
  { id: "S-02", type: "overflow", message: "Reserve Rack R-02 is at 100% capacity; redirect new TechCorp pallets to Overflow Zone.", priority: "medium", actionLabel: "Update Rules" },
  { id: "S-03", type: "replenishment", message: "Forward Pick Zone is low on capacity for fast movers (TechCorp).", priority: "high", actionLabel: "Create Replenishment Task" },
  { id: "S-04", type: "grouping", message: "Returns zone occupancy is rising (85%); clear RTV pallets.", priority: "medium", actionLabel: "Process Returns" },
  { id: "S-05", type: "grouping", message: "Preferred tenant grouping available in Rack R-03 for FitLife.", priority: "low", actionLabel: "Assign Rack" },
];
