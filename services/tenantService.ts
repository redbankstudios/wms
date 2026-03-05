import { Tenant } from "../types";
import { mockTenants, mockHistoricVolumeData } from "../mock/tenants";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const tenantService = {
  async getTenants(): Promise<Tenant[]> {
    await delay(300);
    return mockTenants;
  },
  
  async getTenantById(id: string): Promise<Tenant | undefined> {
    await delay(300);
    return mockTenants.find(t => t.id === id);
  },

  async getHistoricVolumeData(tenantId: string) {
    await delay(300);
    return mockHistoricVolumeData;
  }
};
