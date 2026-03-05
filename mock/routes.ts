import { Route, RouteStop } from "../types";

export const mockRoutes: Route[] = [
  { id: "RT-842", tenantId: "tenant-1", driverId: "DRV-01", driverName: "John Doe", vehicleId: "VEH-101", status: "on_route", shift: "08:00 AM - 04:00 PM", progress: "8/15" },
  { id: "RT-843", tenantId: "tenant-1", driverId: "DRV-02", driverName: "Alice Smith", vehicleId: "VEH-103", status: "on_route", shift: "09:00 AM - 05:00 PM", progress: "2/12" },
  { id: "RT-840", tenantId: "tenant-1", driverId: "DRV-03", driverName: "Bob Johnson", vehicleId: "VEH-105", status: "break", shift: "07:00 AM - 03:00 PM", progress: "10/18" },
  { id: "RT-839", tenantId: "tenant-1", driverId: "DRV-04", driverName: "Sarah Williams", vehicleId: "VEH-102", status: "completed", shift: "06:00 AM - 02:00 PM", progress: "14/14" },
  { id: "RT-844", tenantId: "tenant-1", driverId: "DRV-05", driverName: "Mike Davis", vehicleId: "Unassigned", status: "available", shift: "10:00 AM - 06:00 PM", progress: "0/0" },
];

export const mockRouteStops: RouteStop[] = [
  // RT-842 (John Doe)
  { id: "STP-01", orderId: "ORD-5001", customer: "TechCorp HQ",      address: "123 Innovation Dr, Suite 400", time: "09:00 AM - 11:00 AM", status: "completed", packages: 3, lat: 37.3835, lng: -121.9718 },
  { id: "STP-02", orderId: "ORD-5004", customer: "Sarah Jenkins",     address: "456 Elm St, Apt 2B",          time: "11:30 AM - 01:00 PM", status: "next",      packages: 1, lat: 37.3284, lng: -121.8869, notes: "Leave at front desk if not home." },
  { id: "STP-03", orderId: "ORD-5002", customer: "BeanRoasters Cafe", address: "789 Coffee Ln",               time: "01:30 PM - 03:00 PM", status: "pending",   packages: 5, lat: 37.3688, lng: -121.9886 },
  // RT-843 (Alice Smith)
  { id: "STP-04", orderId: "ORD-5008", customer: "Westfield Tech",    address: "2200 Mission College Blvd",   time: "09:30 AM - 10:30 AM", status: "completed", packages: 2, lat: 37.3862, lng: -121.9754 },
  { id: "STP-05", orderId: "ORD-5005", customer: "Oak Coffee Co",     address: "1320 S Sunnyvale Ave",        time: "10:45 AM - 11:45 AM", status: "next",      packages: 4, lat: 37.3579, lng: -122.0087 },
  { id: "STP-06", customer: "Peak Analytics",    address: "400 Castro St, Mountain View",time: "12:00 PM - 01:00 PM", status: "pending",   packages: 3, lat: 37.3861, lng: -122.0839 },
  { id: "STP-07", customer: "Harbor Fitness",    address: "3900 Fabian Way, Palo Alto",  time: "01:30 PM - 02:30 PM", status: "pending",   packages: 1, lat: 37.4022, lng: -122.0957 },
  // RT-840 (Bob Johnson)
  { id: "STP-08", customer: "Campbell Goods",    address: "480 E Hamilton Ave, Campbell",time: "07:30 AM - 08:30 AM", status: "completed", packages: 6, lat: 37.2871, lng: -121.9500 },
  { id: "STP-09", customer: "Westside Market",   address: "5150 Stevens Creek Blvd",    time: "08:45 AM - 09:45 AM", status: "completed", packages: 2, lat: 37.3230, lng: -121.9610 },
  { id: "STP-10", orderId: "ORD-5003", customer: "FitLife North SJ",  address: "1600 Technology Dr, Milpitas",time: "10:30 AM - 11:30 AM", status: "next",      packages: 8, lat: 37.4323, lng: -121.8996 },
  // RT-839 (Sarah Williams — all completed)
  { id: "STP-11", customer: "Cupertino Depot",   address: "20400 Stevens Creek Blvd",   time: "06:30 AM - 08:00 AM", status: "completed", packages: 5, lat: 37.3230, lng: -122.0322 },
  { id: "STP-12", customer: "Los Gatos Roasters", address: "15 N Santa Cruz Ave",       time: "08:30 AM - 10:00 AM", status: "completed", packages: 3, lat: 37.2358, lng: -121.9624 },
];

export const mockExceptions = [
  { id: "EXC-001", route: "RT-842", driver: "John Doe", stop: "STP-08", customer: "TechCorp", issue: "Customer Not Home", time: "10:45 AM", status: "unresolved" },
  { id: "EXC-002", route: "RT-843", driver: "Alice Smith", stop: "STP-03", customer: "BeanRoasters", issue: "Wrong Address", time: "11:15 AM", status: "unresolved" },
  { id: "EXC-003", route: "RT-840", driver: "Bob Johnson", stop: "STP-05", customer: "FitLife", issue: "Traffic Delay (+45m)", time: "09:30 AM", status: "resolved" },
];
