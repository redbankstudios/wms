"use client"

import * as React from "react"
import { Bell, Search, Moon, Sun, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDemo, DEMO_TENANTS, DEMO_ROLES } from "@/context/DemoContext"
import { useTheme } from "@/context/ThemeContext"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Role } from "@/types"

export function Topbar() {
  const { selectedTenant, setSelectedTenant, selectedRole, setSelectedRole, notificationCount } = useDemo()
  const { theme, toggle } = useTheme()

  return (
    <div className="flex h-16 items-center px-4 border-b bg-white dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center space-x-4">
        <div className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100 mr-4">
          WMS & Delivery
        </div>

        {/* Tenant Switcher */}
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Select
            value={selectedTenant.id}
            onValueChange={(val) => {
              const tenant = DEMO_TENANTS.find(t => t.id === val)
              if (tenant) setSelectedTenant(tenant)
            }}
          >
            <SelectTrigger className="w-[220px] h-9 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
              <SelectValue placeholder="Select Tenant" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_TENANTS.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Select
            value={selectedRole}
            onValueChange={(val) => setSelectedRole(val as Role)}
          >
            <SelectTrigger className="w-[220px] h-9 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
              <SelectValue placeholder="View As Role" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_ROLES.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-slate-400"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative dark:hover:bg-slate-800">
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600"></span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="dark:hover:bg-slate-800"
        >
          {theme === "dark"
            ? <Sun className="h-5 w-5 text-amber-400" />
            : <Moon className="h-5 w-5 text-slate-600" />
          }
        </Button>
      </div>
    </div>
  )
}
