import { User } from "../types";
import { mockUsers } from "../mock/users";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let usersStore: User[] = [...mockUsers];

export const userService = {
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    await delay(200);
    return usersStore.filter(u => u.tenantId === tenantId);
  },

  async createUser(user: Omit<User, "id">): Promise<User> {
    await delay(200);
    const newUser: User = { ...user, id: `USR-${Date.now()}` };
    usersStore = [...usersStore, newUser];
    return newUser;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await delay(200);
    usersStore = usersStore.map(u => u.id === userId ? { ...u, ...updates } : u);
  },

  async deleteUser(userId: string): Promise<void> {
    await delay(200);
    usersStore = usersStore.filter(u => u.id !== userId);
  },
};
