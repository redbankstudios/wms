"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { Role } from "@/types"

export type DemoTenant = {
  id: string
  name: string
  type: string
}

export const DEMO_TENANTS: DemoTenant[] = [
  { id: "tenant-1", name: "Urban 3PL Warehouse", type: "3PL" },
  { id: "tenant-2", name: "Ecommerce Fulfillment", type: "Ecommerce" },
  { id: "tenant-3", name: "Grocery / Same-Day Hub", type: "Grocery" },
  { id: "tenant-4", name: "Electronics / High-Return", type: "Electronics" },
]

export const DEMO_ROLES: { id: Role; name: string }[] = [
  { id: "platform_owner", name: "Platform Owner" },
  { id: "business_owner", name: "Business Owner / Manager" },
  { id: "warehouse_manager", name: "Warehouse Manager" },
  { id: "shipping_manager", name: "Shipping Manager" },
  { id: "warehouse_employee", name: "Warehouse Employee" },
  { id: "packer", name: "Packer" },
  { id: "driver", name: "Driver" },
  { id: "driver_dispatcher", name: "Driver Dispatcher" },
  { id: "b2b_client", name: "B2B Client" },
  { id: "end_customer", name: "End Customer" },
]

interface DemoContextType {
  selectedTenant: DemoTenant
  setSelectedTenant: (tenant: DemoTenant) => void
  selectedRole: Role
  setSelectedRole: (role: Role) => void
  demoDate: Date
  setDemoDate: (date: Date) => void
  activeScenario: string | null
  setActiveScenario: (scenario: string | null) => void
  notificationCount: number
  setNotificationCount: (count: number) => void
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [selectedTenant, setSelectedTenant] = useState<DemoTenant>(DEMO_TENANTS[0])
  const [selectedRole, setSelectedRole] = useState<Role>("platform_owner")
  const [demoDate, setDemoDate] = useState<Date>(new Date("2026-03-03T12:50:01-08:00"))
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [notificationCount, setNotificationCount] = useState<number>(3)

  return (
    <DemoContext.Provider
      value={{
        selectedTenant,
        setSelectedTenant,
        selectedRole,
        setSelectedRole,
        demoDate,
        setDemoDate,
        activeScenario,
        setActiveScenario,
        notificationCount,
        setNotificationCount,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (context === undefined) {
    throw new Error("useDemo must be used within a DemoProvider")
  }
  return context
}
