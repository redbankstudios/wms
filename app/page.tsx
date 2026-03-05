"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { OperationsDashboard } from "@/components/screens/dashboard"
import { InventoryManagement } from "@/components/screens/inventory"
import { StorageManagement } from "@/components/screens/storage"
import { TaskCenter } from "@/components/screens/tasks"
import { RouteBoard } from "@/components/screens/routes"
import { OrderManagement } from "@/components/screens/orders"
import { ReportsDashboard } from "@/components/screens/reports"
import { BillingOverview } from "@/components/screens/billing"
import { TenantsManagement } from "@/components/screens/tenants"
import { FleetManagement } from "@/components/screens/fleet"
import { Settings } from "@/components/screens/settings"
import { ReturnsDashboard } from "@/components/screens/returns"
import { InboundManagement } from "@/components/screens/inbound"
import { MobileWorkerApp } from "@/components/screens/mobile-worker"
import { MobileDriverApp } from "@/components/screens/mobile-driver"
import { DispatcherConsole } from "@/components/screens/dispatcher"
import { DriversManagement } from "@/components/screens/drivers"
import { EmployeesManagement } from "@/components/screens/employees"
import { DispatchQueue } from "@/components/screens/dispatch-queue"
import { ClientPortal } from "@/components/screens/client-portal"
import { B2BDashboard } from "@/components/screens/b2b-dashboard"
import { B2BOutbound } from "@/components/screens/b2b-outbound"
import { B2BProducts } from "@/components/screens/b2b-products"
import { B2BReports } from "@/components/screens/b2b-reports"
import { OrderReports } from "@/components/screens/order-reports"
import { PlatformIntro } from "@/components/screens/platform-intro"
import { useDemo } from "@/context/DemoContext"
import { ROLE_LANDING_PAGES, NAV_ITEMS } from "@/config/roleNavigation"

export default function Home() {
  const { selectedRole } = useDemo()
  const [activeTab, setActiveTab] = React.useState<string>("dashboard")
  const [openOutboundModal, setOpenOutboundModal] = React.useState(false)

  const handleB2BNavigate = React.useCallback((tab: string, action?: string) => {
    setActiveTab(tab)
    if (action === "new-shipment") setOpenOutboundModal(true)
  }, [])

  React.useEffect(() => {
    const updateTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get("tab")
      if (tab) {
        setActiveTab(tab)
      }
    }

    updateTabFromUrl()
    window.addEventListener("popstate", updateTabFromUrl)
    return () => window.removeEventListener("popstate", updateTabFromUrl)
  }, [])

  // Update active tab when role changes
  React.useEffect(() => {
    const landingPage = ROLE_LANDING_PAGES[selectedRole]
    if (landingPage) {
      setActiveTab(landingPage)
    }
  }, [selectedRole])

  const renderContent = () => {
    // Check if the current role has access to the active tab
    const currentNavItem = NAV_ITEMS.find(item => item.id === activeTab)
    if (currentNavItem && !currentNavItem.roles.includes(selectedRole)) {
      return (
        <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Access Denied
          </h2>
          <p className="text-slate-500">You do not have permission to view this screen as a {selectedRole.replace('_', ' ')}.</p>
        </div>
      )
    }

    switch (activeTab) {
      case "intro":
        return <PlatformIntro />
      case "dashboard":
        return <OperationsDashboard />
      case "inbound":
        return <InboundManagement />
      case "inventory":
        return <InventoryManagement />
      case "storage":
        return <StorageManagement />
      case "tasks":
        return <TaskCenter />
      case "employees":
        return <EmployeesManagement />
      case "routes":
        return <RouteBoard />
      case "returns":
        return <ReturnsDashboard />
      case "orders":
        return <OrderManagement />
      case "reports":
        return <ReportsDashboard />
      case "order-reports":
        return <OrderReports />
      case "billing":
        return <BillingOverview />
      case "tenants":
        return <TenantsManagement />
      case "fleet":
        return <FleetManagement />
      case "settings":
        return <Settings />
      case "worker":
        return <MobileWorkerApp />
      case "driver":
        return <MobileDriverApp />
      case "dispatcher":
        return <DispatcherConsole />
      case "drivers":
        return <DriversManagement />
      case "dispatch-queue":
        return <DispatchQueue />
      case "tracking":
        return <ClientPortal />
      case "b2b-dashboard":
        return <B2BDashboard onNavigate={handleB2BNavigate} />
      case "b2b-outbound":
        return <B2BOutbound autoOpenModal={openOutboundModal} onAutoOpenConsumed={() => setOpenOutboundModal(false)} />
      case "b2b-products":
        return <B2BProducts />
      case "b2b-reports":
        return <B2BReports />
      default:
        return (
          <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Screen
            </h2>
            <p className="text-slate-500">This screen is under construction.</p>
          </div>
        )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-slate-950">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 dark:bg-slate-950 dark:text-slate-100">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
