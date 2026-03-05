import { Invoice } from "../types";
import { mockInvoices } from "../mock/billing";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const billingService = {
  async getInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
    await delay(300);
    return mockInvoices.filter(i => i.tenantId === tenantId);
  },
  
  async getAllInvoices(): Promise<Invoice[]> {
    await delay(300);
    return mockInvoices;
  }
};
