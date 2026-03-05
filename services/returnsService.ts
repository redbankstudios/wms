import { Return } from "../types";
import { mockReturns, mockReturnLines } from "../mock/returns";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const returnsService = {
  async getReturnsByTenant(tenantId: string): Promise<Return[]> {
    await delay(300);
    return mockReturns.filter(r => r.tenantId === tenantId);
  },
  
  async getAllReturns(): Promise<Return[]> {
    await delay(300);
    return mockReturns;
  },

  async getReturnLines(returnId: string) {
    await delay(300);
    return (mockReturnLines as any)[returnId] || [];
  }
};
