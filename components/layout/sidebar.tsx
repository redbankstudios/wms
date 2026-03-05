"use client"

import * as React from "react"
import {
  ArrowDownToLine,
  LayoutDashboard,
  Package,
  ShoppingCart,
  ListTodo,
  Map,
  Undo2,
  BarChart3,
  CreditCard,
  Settings,
  Truck,
  Users,
  Smartphone,
  Radio,
  Globe,
  Layers,
  SendToBack,
  Send,
  Pin,
  PinOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDemo } from "@/context/DemoContext"
import { NAV_ITEMS } from "@/config/roleNavigation"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Building2: Users,
  LayoutDashboard: LayoutDashboard,
  ArrowDownToLine: ArrowDownToLine,
  Layers: Layers,
  Package: Package,
  ShoppingCart: ShoppingCart,
  ClipboardList: ListTodo,
  RefreshCcw: Undo2,
  Truck: Truck,
  Map: Radio,
  Route: Map,
  FileText: CreditCard,
  Settings: Settings,
  Smartphone: Smartphone,
  Globe: Globe,
  SendToBack: SendToBack,
  BarChart3: BarChart3,
  Send: Send,
  Users: Users,
}

export function Sidebar({ className, activeTab, setActiveTab }: SidebarProps) {
  const { selectedRole } = useDemo()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isPinned, setIsPinned] = React.useState(false)

  // Restore pinned state from localStorage on mount
  React.useEffect(() => {
    const pinned = localStorage.getItem("sidebarPinned") === "true"
    if (pinned) {
      const open = localStorage.getItem("sidebarPinnedOpen") === "true"
      setIsPinned(true)
      setIsOpen(open)
    }
  }, [])

  function handleMouseEnter() {
    if (!isPinned) setIsOpen(true)
  }

  function handleMouseLeave() {
    if (!isPinned) setIsOpen(false)
  }

  function togglePin() {
    setIsPinned(prev => {
      const next = !prev
      if (next) {
        localStorage.setItem("sidebarPinned", "true")
        localStorage.setItem("sidebarPinnedOpen", String(isOpen))
      } else {
        localStorage.removeItem("sidebarPinned")
        localStorage.removeItem("sidebarPinnedOpen")
      }
      return next
    })
  }

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(selectedRole))

  const overviewItems = visibleItems.filter(item => ["intro"].includes(item.id))
  const warehouseItems = visibleItems.filter(item => ["dashboard", "inbound", "inventory", "storage", "orders", "tasks", "employees", "returns"].includes(item.id))
  const clientItems = visibleItems.filter(item => ["reports", "order-reports"].includes(item.id))
  const adminItems = visibleItems.filter(item => ["tenants", "fleet", "drivers", "settings"].includes(item.id))
  const dispatchItems = visibleItems.filter(item => ["dispatcher", "routes", "dispatch-queue"].includes(item.id))
  const mobileItems = visibleItems.filter(item => ["worker", "driver", "tracking"].includes(item.id))
  const b2bPortalOrder = ["b2b-dashboard", "b2b-outbound", "b2b-products", "inventory", "orders", "b2b-reports", "billing"]
  const b2bPortalItems = selectedRole === "b2b_client"
    ? b2bPortalOrder.flatMap(id => visibleItems.filter(item => item.id === id))
    : []
  const clientViewOrder = ["b2b-dashboard", "b2b-outbound", "b2b-products", "billing", "b2b-reports"]
  const clientViewItems = selectedRole === "platform_owner"
    ? clientViewOrder.flatMap(id => visibleItems.filter(item => item.id === id))
    : []

  function renderNavItem({ id, icon, label }: { id: string; icon: string; label: string }) {
    const Icon = iconMap[icon] || LayoutDashboard
    return (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        title={!isOpen ? label : undefined}
        className={cn(
          "w-full flex items-center rounded-md p-2 text-sm font-medium transition-colors",
          "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100",
          isOpen ? "justify-start" : "justify-center",
          activeTab === id
            ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
            : "text-slate-600 dark:text-slate-400"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isOpen && "mr-2")} />
        <span className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-200",
          isOpen ? "max-w-full opacity-100" : "max-w-0 opacity-0"
        )}>
          {label}
        </span>
      </button>
    )
  }

  function renderSectionGroup({ title, items, stripPrefix }: { title: string; items: typeof visibleItems; stripPrefix?: string }) {
    if (items.length === 0) return null
    return (
      <div className={cn("py-2", isOpen ? "px-3" : "px-2")}>
        <div className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-8 opacity-100 mb-2" : "max-h-0 opacity-0 mb-0"
        )}>
          <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </h2>
        </div>
        {!isOpen && <div className="mb-1 mx-1 border-t border-slate-200 dark:border-slate-700" />}
        <div className="space-y-0.5">
          {items.map((item) => {
            const label = stripPrefix ? item.label.replace(new RegExp(`^${stripPrefix}`), "") : item.label
            return <React.Fragment key={item.id}>{renderNavItem({ id: item.id, icon: item.icon, label })}</React.Fragment>
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "pb-12 border-r bg-slate-50/50 hidden md:flex flex-col overflow-hidden",
        "transition-[width] duration-200 ease-in-out",
        "dark:bg-slate-900 dark:border-slate-700",
        isOpen ? "w-56" : "w-14",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">

        {/* Overview header with inline pin */}
        {overviewItems.length > 0 && (
          <div className={cn("py-2", isOpen ? "px-3" : "px-2")}>
            <div className={cn(
              "flex items-center mb-2 transition-all duration-200",
              isOpen ? "justify-between px-2" : "justify-center"
            )}>
              <h2 className={cn(
                "text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 overflow-hidden whitespace-nowrap transition-all duration-200",
                isOpen ? "max-w-full opacity-100" : "max-w-0 opacity-0"
              )}>
                Overview
              </h2>
              <button
                onClick={togglePin}
                title={isPinned
                  ? `Unpin sidebar (pinned ${isOpen ? "open" : "closed"})`
                  : "Pin sidebar in current state"}
                className={cn(
                  "shrink-0 rounded p-0.5 transition-colors",
                  isPinned
                    ? "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
                )}
              >
                {isPinned
                  ? <PinOff className="h-3.5 w-3.5" />
                  : <Pin className="h-3.5 w-3.5" />
                }
              </button>
            </div>
            <div className="space-y-0.5">
              {overviewItems.map(item => (
                <React.Fragment key={item.id}>{renderNavItem({ id: item.id, icon: item.icon, label: item.label })}</React.Fragment>
              ))}
            </div>
          </div>
        )}

        {renderSectionGroup({ title: "My Portal", items: b2bPortalItems, stripPrefix: "Client " })}
        {selectedRole !== "b2b_client" && (
          renderSectionGroup({ title: "Warehouse", items: warehouseItems })
        )}
        {selectedRole !== "b2b_client" && (
          renderSectionGroup({ title: "Reports", items: clientItems })
        )}
        {renderSectionGroup({ title: "Client Views", items: clientViewItems })}
        {renderSectionGroup({ title: "Dispatch & Delivery", items: dispatchItems })}
        {renderSectionGroup({ title: "Admin", items: adminItems })}
        {renderSectionGroup({ title: "Mobile Views", items: mobileItems })}
      </div>
    </div>
  )
}
