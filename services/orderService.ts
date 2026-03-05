import { Order } from "../types";
import { mockOrders, mockOrderLines } from "../mock/orders";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const orderService = {
  async getOrdersByTenant(tenantId: string): Promise<Order[]> {
    await delay(300);
    return mockOrders.filter(o => o.tenantId === tenantId);
  },
  
  async getAllOrders(): Promise<Order[]> {
    await delay(300);
    return mockOrders;
  },

  async getOrderLines(orderId: string) {
    await delay(300);
    return (mockOrderLines as any)[orderId] || [];
  }
};
