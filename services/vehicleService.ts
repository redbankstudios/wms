import { Vehicle } from "../types";
import { mockVehicles } from "../mock/vehicles";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const vehicleService = {
  async getVehiclesByTenant(tenantId: string): Promise<Vehicle[]> {
    await delay(300);
    return mockVehicles.filter(v => v.tenantId === tenantId);
  },

  async getAllVehicles(): Promise<Vehicle[]> {
    await delay(300);
    return mockVehicles;
  },

  async createVehicle(data: Omit<Vehicle, "id"> & { tenantId: string }): Promise<Vehicle> {
    await delay(300);
    const v: Vehicle = { ...data, id: `VEH-${Date.now()}` };
    mockVehicles.push(v);
    return v;
  },

  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    await delay(300);
    const idx = mockVehicles.findIndex(v => v.id === vehicleId);
    if (idx === -1) throw new Error("Vehicle not found");
    mockVehicles[idx] = { ...mockVehicles[idx], ...updates };
    return mockVehicles[idx];
  },

  async deleteVehicle(vehicleId: string): Promise<void> {
    await delay(300);
    const idx = mockVehicles.findIndex(v => v.id === vehicleId);
    if (idx !== -1) mockVehicles.splice(idx, 1);
  },
};
