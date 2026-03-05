import { Vehicle } from "../types";

export const mockVehicles: Vehicle[] = [
  { id: "VEH-101", tenantId: "tenant-1", type: "Cargo Van",        plate: "CA-88921", status: "good",          driver: "John Doe",       location: "On Route (Downtown)",   lastService: "Aug 15, 2023", nextService: "Feb 15, 2024", maxWeightKg: 1000, maxPackages: 150 },
  { id: "VEH-102", tenantId: "tenant-1", type: "Box Truck (16')",  plate: "CA-99210", status: "needs_service", driver: "Sarah Williams", location: "Warehouse Yard",        lastService: "May 10, 2023", nextService: "Nov 10, 2023", maxWeightKg: 3500, maxPackages: 400 },
  { id: "VEH-103", tenantId: "tenant-1", type: "Cargo Van",        plate: "CA-88922", status: "good",          driver: "Alice Smith",    location: "On Route (Northside)",  lastService: "Sep 01, 2023", nextService: "Mar 01, 2024", maxWeightKg: 1000, maxPackages: 150 },
  { id: "VEH-104", tenantId: "tenant-1", type: "Cargo Van",        plate: "CA-88923", status: "good",          driver: "Unassigned",     location: "Warehouse Yard",        lastService: "Sep 15, 2023", nextService: "Mar 15, 2024", maxWeightKg: 1000, maxPackages: 150 },
  { id: "VEH-105", tenantId: "tenant-1", type: "Box Truck (24')",  plate: "CA-77123", status: "in_repair",     driver: "Unassigned",     location: "Joe's Auto Shop",       lastService: "Oct 20, 2023", nextService: "TBD",          maxWeightKg: 1500, maxPackages: 200 },
  { id: "VEH-106", tenantId: "tenant-1", type: "Box Truck (16')",  plate: "CA-99211", status: "good",          driver: "Unassigned",     location: "Warehouse Yard",        lastService: "Oct 01, 2023", nextService: "Apr 01, 2024", maxWeightKg: 3500, maxPackages: 400 },
];
