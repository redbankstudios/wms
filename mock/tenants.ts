import { Tenant } from "../types";

export const mockTenants: Tenant[] = [
  { id: "TEN-001", name: "TechCorp Electronics", contact: "Sarah Jenkins", email: "sarah@techcorp.com", phone: "555-0123", status: "active", storageUsed: 1250, storageCapacity: 2000, storageLabel: "1,250 / 2,000", plan: "Enterprise", address: "123 Tech Blvd, San Jose, CA 95110", joined: "Jan 15, 2022", billingCycle: "Monthly (1st)", paymentMethod: "Visa •••• 4242" },
  { id: "TEN-002", name: "BeanRoasters Coffee", contact: "Mike Torres", email: "mike@beanroasters.com", phone: "555-0124", status: "active", storageUsed: 450, storageCapacity: 500, storageLabel: "450 / 500", plan: "Pro", address: "456 Roaster Way, Seattle, WA 98101", joined: "Mar 22, 2022", billingCycle: "Monthly (15th)", paymentMethod: "Mastercard •••• 8899" },
  { id: "TEN-003", name: "FitLife Athletics", contact: "Jessica Wong", email: "jwong@fitlife.com", phone: "555-0125", status: "onboarding", storageUsed: 0, storageCapacity: 1000, storageLabel: "0 / 1,000", plan: "Pro", address: "789 Fitness Dr, Austin, TX 78701", joined: "Oct 01, 2023", billingCycle: "Monthly (1st)", paymentMethod: "Pending" },
  { id: "TEN-004", name: "HomeGoods Plus", contact: "David Chen", email: "dchen@homegoods.com", phone: "555-0126", status: "inactive", storageUsed: 0, storageCapacity: 0, storageLabel: "0 / 0", plan: "Basic", address: "321 Home Ln, Chicago, IL 60601", joined: "Jun 10, 2021", billingCycle: "Manual", paymentMethod: "Wire Transfer" },
];

export const mockHistoricVolumeData = [
  { month: "Jan", shipped: 4000, returned: 240, volume: 1200 },
  { month: "Feb", shipped: 3000, returned: 139, volume: 1100 },
  { month: "Mar", shipped: 4200, returned: 280, volume: 1300 },
  { month: "Apr", shipped: 4780, returned: 390, volume: 1450 },
  { month: "May", shipped: 5890, returned: 480, volume: 1600 },
  { month: "Jun", shipped: 4390, returned: 380, volume: 1500 },
  { month: "Jul", shipped: 5490, returned: 430, volume: 1700 },
  { month: "Aug", shipped: 6000, returned: 540, volume: 1850 },
  { month: "Sep", shipped: 5200, returned: 439, volume: 1750 },
  { month: "Oct", shipped: 6800, returned: 580, volume: 2100 },
  { month: "Nov", shipped: 8780, returned: 790, volume: 2600 },
  { month: "Dec", shipped: 10890, returned: 980, volume: 3200 },
];
