import { Notification } from "../types";
import { mockNotifications } from "../mock/notifications";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const notificationService = {
  async getNotificationsByTenant(tenantId: string): Promise<Notification[]> {
    await delay(300);
    return mockNotifications.filter(n => n.tenantId === tenantId);
  }
};
