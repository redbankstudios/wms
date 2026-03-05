import { InventoryItem } from "../types";
import { mockInventory } from "../mock/inventory";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const inventoryService = {
  async getInventoryByTenant(tenantId: string): Promise<InventoryItem[]> {
    await delay(300);
    return mockInventory.filter(i => i.tenantId === tenantId);
  },
  
  async getAllInventory(): Promise<InventoryItem[]> {
    await delay(300);
    return mockInventory;
  }
};
