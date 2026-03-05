"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  UserCog, Plus, Pencil, Trash2, Loader2, Search,
  Users, CheckCircle2, Package, HardHat,
} from "lucide-react"
import { User, Role } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

// ── Constants ─────────────────────────────────────────────────────────────────

const WAREHOUSE_ROLES: Role[] = ["warehouse_manager", "warehouse_employee", "packer"]

const ROLE_LABEL: Record<Role, string> = {
  warehouse_manager:  "Manager",
  warehouse_employee: "Warehouse Staff",
  packer:             "Packer",
  platform_owner:     "Platform Owner",
  business_owner:     "Business Owner",
  shipping_manager:   "Shipping Manager",
  driver:             "Driver",
  driver_dispatcher:  "Dispatcher",
  b2b_client:         "B2B Client",
  end_customer:       "Customer",
}

const ROLE_COLOR: Record<Role, string> = {
  warehouse_manager:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  warehouse_employee: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  packer:             "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  platform_owner:     "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  business_owner:     "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  shipping_manager:   "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  driver:             "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  driver_dispatcher:  "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  b2b_client:         "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  end_customer:       "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
}

type FilterTab = "all" | "warehouse_manager" | "warehouse_employee" | "packer"

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",                label: "All"       },
  { id: "warehouse_manager",  label: "Managers"  },
  { id: "warehouse_employee", label: "Staff"     },
  { id: "packer",             label: "Packers"   },
]

// ── Initials helper ───────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
}

// ── Avatar colors (stable per name) ──────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-amber-500",
  "bg-emerald-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500",
]
function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ── Employee Form Modal ───────────────────────────────────────────────────────

interface EmployeeFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<User, "id" | "tenantId">) => void
  initial?: User
  saving?: boolean
}

function EmployeeFormModal({ open, onClose, onSave, initial, saving }: EmployeeFormProps) {
  const [name,   setName]   = React.useState(initial?.name   ?? "")
  const [email,  setEmail]  = React.useState(initial?.email  ?? "")
  const [role,   setRole]   = React.useState<Role>(initial?.role ?? "warehouse_employee")
  const [active, setActive] = React.useState(initial?.active ?? true)

  React.useEffect(() => {
    if (open) {
      setName(initial?.name   ?? "")
      setEmail(initial?.email  ?? "")
      setRole(initial?.role   ?? "warehouse_employee")
      setActive(initial?.active ?? true)
    }
  }, [open, initial])

  const valid = name.trim().length > 0 && email.trim().length > 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!valid) return
    onSave({ name: name.trim(), email: email.trim(), role, active })
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
          {initial ? "Edit Employee" : "Add Employee"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="emp-name">Full Name</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="emp-email">Email</Label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. jane@company.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="emp-role">Role</Label>
            <select
              id="emp-role"
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="mt-1 w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {WAREHOUSE_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Active</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Can be assigned to tasks</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors relative ${active ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!valid || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {initial ? "Save Changes" : "Add Employee"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeesManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [employees, setEmployees] = React.useState<User[]>([])
  const [loading,   setLoading]   = React.useState(true)
  const [search,    setSearch]    = React.useState("")
  const [filter,    setFilter]    = React.useState<FilterTab>("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing,   setEditing]   = React.useState<User | undefined>()
  const [saving,    setSaving]    = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const tenantId = selectedTenant?.id ?? "tenant-1"

  React.useEffect(() => {
    setLoading(true)
    api.users.getUsersByTenant(tenantId).then(data => {
      setEmployees(data.filter(u => WAREHOUSE_ROLES.includes(u.role)))
      setLoading(false)
    })
  }, [api, tenantId])

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = employees.filter(e => {
    const matchRole   = filter === "all" || e.role === filter
    const matchSearch = search === "" ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const counts = {
    total:    employees.length,
    active:   employees.filter(e => e.active).length,
    staff:    employees.filter(e => e.role === "warehouse_employee").length,
    packers:  employees.filter(e => e.role === "packer").length,
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openAdd  = () => { setEditing(undefined); setModalOpen(true) }
  const openEdit = (emp: User) => { setEditing(emp); setModalOpen(true) }

  const handleSave = async (data: Omit<User, "id" | "tenantId">) => {
    setSaving(true)
    try {
      if (editing) {
        await api.users.updateUser(editing.id, data)
        setEmployees(prev => prev.map(e => e.id === editing.id ? { ...e, ...data } : e))
      } else {
        const created = await api.users.createUser({ ...data, tenantId })
        setEmployees(prev => [...prev, created])
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (emp: User) => {
    setDeletingId(emp.id)
    try {
      await api.users.deleteUser(emp.id)
      setEmployees(prev => prev.filter(e => e.id !== emp.id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (emp: User) => {
    const updated = !emp.active
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: updated } : e))
    await api.users.updateUser(emp.id, { active: updated })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <UserCog className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Employees</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Warehouse staff available for task assignment</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Staff",      value: counts.total,   icon: Users,         color: "text-slate-600 dark:text-slate-300",   bg: "bg-slate-100 dark:bg-slate-800"   },
          { label: "Active",           value: counts.active,  icon: CheckCircle2,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950" },
          { label: "Warehouse Staff",  value: counts.staff,   icon: HardHat,       color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-950"      },
          { label: "Packers",          value: counts.packers, icon: Package,       color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950"    },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="dark:border-slate-700">
            <CardContent className="p-4 flex items-center gap-4 dark:bg-slate-800">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.id
                  ? "border-blue-600 text-blue-700 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                {tab.id === "all"
                  ? employees.length
                  : employees.filter(e => e.role === tab.id).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="dark:border-slate-700">
        <CardContent className="p-0 dark:bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-medium text-slate-500 dark:text-slate-400">No employees found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {search ? "Try a different search term" : "Add your first employee to get started"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className={`border-b last:border-0 border-slate-50 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${!emp.active ? "opacity-60" : ""}`}
                  >
                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(emp.name)}`}>
                          {initials(emp.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{emp.name}</p>
                          <p className="text-xs text-slate-400 font-mono md:hidden">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <Badge className={`${ROLE_COLOR[emp.role]} border-0 font-medium`}>
                        {ROLE_LABEL[emp.role]}
                      </Badge>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {emp.email}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className="flex items-center gap-1.5 group"
                        title={emp.active ? "Click to deactivate" : "Click to activate"}
                      >
                        <span className={`h-2 w-2 rounded-full ${emp.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                        <span className={`text-xs font-medium ${emp.active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                          {emp.active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          disabled={deletingId === emp.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {deletingId === emp.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
        saving={saving}
      />
    </div>
  )
}
