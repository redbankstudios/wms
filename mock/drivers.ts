import { Driver } from "../types"

export const mockDrivers: Driver[] = [
  { id: "DRV-01", tenantId: "tenant-1", name: "John Doe",       email: "john.doe@techcorp.com",    phone: "(408) 555-0101", vehicleId: "VEH-101", zoneId: "DZ-002", maxStops: 15, status: "active" },
  { id: "DRV-02", tenantId: "tenant-1", name: "Alice Smith",    email: "alice.smith@techcorp.com", phone: "(408) 555-0102", vehicleId: "VEH-103", zoneId: "DZ-003", maxStops: 12, status: "active" },
  { id: "DRV-03", tenantId: "tenant-1", name: "Bob Johnson",    email: "bob.johnson@techcorp.com", phone: "(408) 555-0103", vehicleId: "VEH-105", zoneId: "DZ-004", maxStops: 18, status: "active" },
  { id: "DRV-04", tenantId: "tenant-1", name: "Sarah Williams", email: "sarah.w@techcorp.com",     phone: "(408) 555-0104", vehicleId: "VEH-102", zoneId: "DZ-001", maxStops: 14, status: "active" },
  { id: "DRV-05", tenantId: "tenant-1", name: "Mike Davis",     email: "mike.davis@techcorp.com",  phone: "(408) 555-0105", vehicleId: undefined,  zoneId: "DZ-002", maxStops: 15, status: "active" },
]
