import { Invoice } from "../types";

export const mockInvoices: Invoice[] = [
  { id: "INV-2023-10", tenantId: "tenant-1", date: "Oct 01, 2023", amount: "$12,450.00", status: "paid", period: "Sep 2023" },
  { id: "INV-2023-09", tenantId: "tenant-1", date: "Sep 01, 2023", amount: "$11,820.50", status: "paid", period: "Aug 2023" },
  { id: "INV-2023-08", tenantId: "tenant-1", date: "Aug 01, 2023", amount: "$10,950.00", status: "paid", period: "Jul 2023" },
  { id: "INV-2023-11", tenantId: "tenant-1", date: "Nov 01, 2023", amount: "$13,100.00", status: "due", period: "Oct 2023" },
];
