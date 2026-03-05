import { InventoryItem } from "../types";

export const mockInventory: InventoryItem[] = [
  { id: "INV-001", tenantId: "tenant-1", sku: "SKU-1001", name: "Wireless Earbuds", location: "A-01-01", status: "available", qty: 450, minStock: 500, client: "TechCorp" },
  { id: "INV-002", tenantId: "tenant-1", sku: "SKU-1002", name: "Smart Watch", location: "A-01-02", status: "reserved", qty: 120, minStock: 100, client: "TechCorp" },
  { id: "INV-003", tenantId: "tenant-2", sku: "SKU-2001", name: "Organic Coffee Beans", location: "B-02-01", status: "available", qty: 850, minStock: 500, client: "BeanRoasters" },
  { id: "INV-004", tenantId: "tenant-2", sku: "SKU-2002", name: "Espresso Machine", location: "B-02-02", status: "quarantined", qty: 15, minStock: 20, client: "BeanRoasters" },
  { id: "INV-005", tenantId: "tenant-3", sku: "SKU-3001", name: "Yoga Mat", location: "C-01-01", status: "available", qty: 320, minStock: 150, client: "FitLife" },
];
