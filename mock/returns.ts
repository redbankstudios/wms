import { Return } from "../types";

export const mockReturns: Return[] = [
  { id: "RET-9001", tenantId: "tenant-1", orderId: "ORD-5001", client: "TechCorp", date: "Oct 25, 2023", items: 1, reason: "Defective", status: "pending", disposition: "-" },
  { id: "RET-9002", tenantId: "tenant-1", orderId: "ORD-4920", client: "FitLife", date: "Oct 24, 2023", items: 2, reason: "Wrong Size", status: "inspecting", disposition: "-" },
  { id: "RET-9003", tenantId: "tenant-1", orderId: "ORD-4855", client: "BeanRoasters", date: "Oct 22, 2023", items: 1, reason: "Damaged in Transit", status: "completed", disposition: "Scrap" },
  { id: "RET-9004", tenantId: "tenant-1", orderId: "ORD-4810", client: "TechCorp", date: "Oct 21, 2023", items: 3, reason: "Customer Cancellation", status: "completed", disposition: "Restock" },
];

export const mockReturnLines = {
  "RET-9001": [
    { sku: "SKU-1001", name: "Wireless Earbuds", qty: 1, condition: "Unknown" },
  ],
  "RET-9002": [
    { sku: "SKU-3044", name: "Yoga Mat (Blue)", qty: 2, condition: "Opened" },
  ]
};
