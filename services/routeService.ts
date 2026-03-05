import { Route, RouteStop } from "../types";
import { mockRoutes, mockRouteStops, mockExceptions } from "../mock/routes";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Maps each route ID to its stop IDs
const ROUTE_STOP_MAP: Record<string, string[]> = {
  "RT-842": ["STP-01", "STP-02", "STP-03"],
  "RT-843": ["STP-04", "STP-05", "STP-06", "STP-07"],
  "RT-840": ["STP-08", "STP-09", "STP-10"],
  "RT-839": ["STP-11", "STP-12"],
};

export const routeService = {
  async getRoutesByTenant(tenantId: string): Promise<Route[]> {
    await delay(300);
    return mockRoutes.filter(r => r.tenantId === tenantId);
  },

  async getAllRoutes(): Promise<Route[]> {
    await delay(300);
    return mockRoutes;
  },

  async getRouteStops(routeId: string): Promise<RouteStop[]> {
    await delay(300);
    const stopIds = ROUTE_STOP_MAP[routeId] ?? [];
    return mockRouteStops.filter(s => stopIds.includes(s.id));
  },

  async getExceptions(): Promise<any[]> {
    await delay(300);
    return mockExceptions;
  }
};
