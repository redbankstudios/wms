import { Role } from "@/types"

export type NavItem = {
  id: string
  label: string
  icon: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { id: "intro", label: "Platform Intro", icon: "Layers", roles: ["platform_owner", "business_owner", "warehouse_manager", "shipping_manager", "warehouse_employee", "packer", "driver", "driver_dispatcher", "b2b_client", "end_customer"] },
  { id: "tenants", label: "Tenants", icon: "Building2", roles: ["platform_owner"] },
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["platform_owner", "business_owner", "warehouse_manager"] },
  { id: "inbound", label: "Inbound", icon: "ArrowDownToLine", roles: ["platform_owner", "business_owner", "warehouse_manager", "warehouse_employee"] },
  { id: "storage", label: "Storage", icon: "Layers", roles: ["platform_owner", "business_owner", "warehouse_manager"] },
  { id: "inventory", label: "Inventory", icon: "Package", roles: ["platform_owner", "business_owner", "warehouse_manager", "b2b_client"] },
  { id: "orders", label: "Orders", icon: "ShoppingCart", roles: ["platform_owner", "business_owner", "warehouse_manager", "b2b_client"] },
  { id: "tasks",     label: "Tasks",     icon: "ClipboardList", roles: ["platform_owner", "warehouse_manager", "warehouse_employee", "packer"] },
  { id: "employees", label: "Employees", icon: "UserCog",       roles: ["platform_owner", "business_owner", "warehouse_manager"] },
  { id: "returns",   label: "Returns",   icon: "RefreshCcw",    roles: ["platform_owner", "business_owner", "warehouse_manager"] },
  { id: "reports", label: "Business Reports", icon: "BarChart3", roles: ["platform_owner", "business_owner", "warehouse_manager"] },
  { id: "billing", label: "Client Billing", icon: "FileText", roles: ["platform_owner", "business_owner"] },
  { id: "fleet", label: "Fleet", icon: "Truck", roles: ["platform_owner", "business_owner", "shipping_manager"] },
  { id: "dispatcher", label: "Dispatcher", icon: "Map", roles: ["platform_owner", "shipping_manager", "driver_dispatcher"] },
  { id: "routes", label: "Routes", icon: "Route", roles: ["platform_owner", "shipping_manager", "driver_dispatcher"] },
  { id: "dispatch-queue", label: "Dispatch Queue", icon: "Send", roles: ["platform_owner", "business_owner", "shipping_manager", "driver_dispatcher"] },
  { id: "drivers", label: "Drivers", icon: "Users", roles: ["platform_owner", "business_owner", "shipping_manager"] },
  { id: "settings", label: "Settings", icon: "Settings", roles: ["platform_owner", "business_owner"] },
  { id: "worker", label: "Worker App", icon: "Smartphone", roles: ["platform_owner", "warehouse_employee", "packer"] },
  { id: "driver", label: "Driver App", icon: "Smartphone", roles: ["platform_owner", "driver"] },
  { id: "tracking", label: "Tracking Portal", icon: "Globe", roles: ["platform_owner", "end_customer"] },
  // B2B Client Portal items
  { id: "b2b-dashboard", label: "Client Dashboard", icon: "LayoutDashboard", roles: ["b2b_client", "platform_owner"] },
  { id: "b2b-outbound", label: "Client Outbound", icon: "SendToBack", roles: ["b2b_client", "platform_owner"] },
  { id: "b2b-products", label: "Client Products", icon: "Package", roles: ["b2b_client", "platform_owner"] },
  { id: "b2b-reports", label: "Client Reports", icon: "BarChart3", roles: ["b2b_client", "platform_owner"] },
]

export const ROLE_LANDING_PAGES: Record<Role, string> = {
  platform_owner: "intro",
  business_owner: "intro",
  warehouse_manager: "intro",
  shipping_manager: "intro",
  warehouse_employee: "intro",
  packer: "intro",
  driver: "intro",
  driver_dispatcher: "intro",
  b2b_client: "intro",
  end_customer: "intro",
}
