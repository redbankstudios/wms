import { Order } from "../types";

export const mockOrders: Order[] = [
  { id: "ORD-5001", tenantId: "tenant-1", client: "TechCorp", date: "Oct 24, 2023", items: 45, status: "shipped", destination: "San Francisco, CA" },
  { id: "ORD-5002", tenantId: "tenant-2", client: "BeanRoasters", date: "Oct 24, 2023", items: 12, status: "packed", destination: "Seattle, WA" },
  { id: "ORD-5003", tenantId: "tenant-3", client: "FitLife", date: "Oct 24, 2023", items: 3, status: "picking", destination: "Austin, TX" },
  { id: "ORD-5004", tenantId: "tenant-1", client: "TechCorp", date: "Oct 23, 2023", items: 5, status: "packed", destination: "Austin, TX" },
  { id: "ORD-5005", tenantId: "tenant-2", client: "BeanRoasters", date: "Oct 23, 2023", items: 8, status: "allocated", destination: "Portland, OR" },
  { id: "ORD-5006", tenantId: "tenant-3", client: "FitLife", date: "Oct 23, 2023", items: 1, status: "pending", destination: "Dallas, TX" },
  { id: "ORD-5007", tenantId: "tenant-2", client: "BeanRoasters", date: "Oct 23, 2023", items: 24, status: "delivered", destination: "Vancouver, BC" },
  { id: "ORD-5008", tenantId: "tenant-1", client: "TechCorp", date: "Oct 23, 2023", items: 120, status: "picking", destination: "New York, NY" },
];

export const mockOrderLines: Record<string, { id: string; sku: string; name: string; qty: number; allocatedQty: number }[]> = {
  "ORD-5001": [
    { id: "LN-10", sku: "SKU-1001", name: "Laptop Stand (Aluminum)", qty: 20, allocatedQty: 20 },
    { id: "LN-11", sku: "SKU-1002", name: "USB-C Hub 7-in-1", qty: 15, allocatedQty: 15 },
    { id: "LN-12", sku: "SKU-1003", name: "Wireless Keyboard", qty: 10, allocatedQty: 10 },
  ],
  "ORD-5002": [
    { id: "LN-20", sku: "SKU-2001", name: "Single Origin Ethiopia (250g)", qty: 6, allocatedQty: 6 },
    { id: "LN-21", sku: "SKU-2002", name: "Cold Brew Concentrate (500ml)", qty: 6, allocatedQty: 6 },
  ],
  "ORD-5003": [
    { id: "LN-1", sku: "SKU-3001", name: "Yoga Mat (Blue)", qty: 2, allocatedQty: 2 },
    { id: "LN-2", sku: "SKU-3044", name: "Resistance Bands Set", qty: 1, allocatedQty: 0 },
  ],
  "ORD-5004": [
    { id: "LN-30", sku: "SKU-1004", name: "Noise-Cancelling Headphones", qty: 3, allocatedQty: 3 },
    { id: "LN-31", sku: "SKU-1005", name: "Portable Charger 20000mAh", qty: 2, allocatedQty: 2 },
  ],
  "ORD-5005": [
    { id: "LN-40", sku: "SKU-2003", name: "Espresso Blend (1kg)", qty: 4, allocatedQty: 2 },
    { id: "LN-41", sku: "SKU-2004", name: "Reusable Coffee Filters (50pk)", qty: 4, allocatedQty: 0 },
  ],
  "ORD-5008": [
    { id: "LN-50", sku: "SKU-1006", name: "4K Webcam Pro", qty: 50, allocatedQty: 50 },
    { id: "LN-51", sku: "SKU-1007", name: "Dual Monitor Arm", qty: 40, allocatedQty: 30 },
    { id: "LN-52", sku: "SKU-1008", name: "Ergonomic Mouse", qty: 30, allocatedQty: 20 },
  ],
};
