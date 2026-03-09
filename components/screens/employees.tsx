"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus, Pencil, Trash2, Loader2, Search,
  Users, CheckCircle2,
  AlertTriangle, BarChart2, ClipboardList,
  Zap, Info, AlertCircle, ChevronDown,
  X, UserPlus, RefreshCw, ArrowRight,
} from "lucide-react"
import { User, Role, Task, TaskType } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import {
  getEmployeeTodayLoad,
  getEmployeeRemainingCapacity,
  DEFAULT_QUOTA_PACKAGES,
  DEFAULT_QUOTA_TASKS,
  todayDateString,
  classifyTaskFocus,
  isQuotaConfigured,
  getUnassignedByType,
  generateLaborRecommendations,
  buildAssignmentPlan,
  findRebalanceCandidates,
  ProposedAssignment,
  AssignmentResult,
  TaskFocus,
  LaborRecommendation,
  RecActionTag,
} from "@/services/taskAssignmentService"

// ── Navigation helpers ────────────────────────────────────────────────────────

function navigateToTasks(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ tab: "tasks", ...params })
  window.history.pushState(null, "", `?${qs}`)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

// ── Session log ───────────────────────────────────────────────────────────────

interface SessionLogEntry { message: string; ts: number }

function SessionLogBanner({ entries, onClear }: { entries: SessionLogEntry[]; onClear: () => void }) {
  if (entries.length === 0) return null
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0 space-y-0.5">
        {[...entries].reverse().map((e, i) => (
          <p key={i} className="text-xs text-emerald-700 dark:text-emerald-300 truncate">{e.message}</p>
        ))}
      </div>
      <button onClick={onClear} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

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

const TASK_TYPE_BADGE: Record<TaskType, string> = {
  Receive: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Putaway: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Pick:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Pack:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Return:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
}

const ALL_TASK_TYPES: TaskType[] = ["Receive", "Putaway", "Pick", "Pack", "Return"]

type RoleFilterTab = "all" | "warehouse_manager" | "warehouse_employee" | "packer"

const ROLE_FILTER_TABS: { id: RoleFilterTab; label: string }[] = [
  { id: "all",                label: "All"      },
  { id: "warehouse_manager",  label: "Managers" },
  { id: "warehouse_employee", label: "Staff"    },
  { id: "packer",             label: "Packers"  },
]

type WorkloadFilter = "all" | "with-capacity" | "near-limit" | "overloaded" | "idle" | "mixed"

const WORKLOAD_FILTERS: { id: WorkloadFilter; label: string }[] = [
  { id: "all",           label: "All"           },
  { id: "with-capacity", label: "With Capacity" },
  { id: "near-limit",    label: "Near Limit"    },
  { id: "overloaded",    label: "Overloaded"    },
  { id: "idle",          label: "Idle"          },
  { id: "mixed",         label: "Mixed Types"   },
]

type SortBy = "name" | "most-loaded" | "most-capacity" | "most-fragmented"

const FOCUS_SIGNAL: Record<TaskFocus, { label: string; dot: string; text: string }> = {
  Focused:    { label: "Focused",    dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  Split:      { label: "Split",      dot: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400"       },
  Fragmented: { label: "Fragmented", dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400"     },
  Idle:       { label: "Idle",       dot: "bg-slate-400",   text: "text-slate-400 dark:text-slate-500"     },
}

const REC_STYLE: Record<LaborRecommendation["severity"], { border: string; icon: React.FC<{ className?: string }>; iconColor: string }> = {
  action:  { border: "border-l-blue-500",  icon: Zap,         iconColor: "text-blue-500"  },
  warning: { border: "border-l-amber-500", icon: AlertCircle, iconColor: "text-amber-500" },
  info:    { border: "border-l-slate-400", icon: Info,        iconColor: "text-slate-400" },
}

// ── Action modal types ────────────────────────────────────────────────────────

type ActionModalState =
  | { mode: "assign-work"; employeeId: string }
  | { mode: "rebalance";   sourceEmployeeId: string }
  | { mode: "coverage";    taskType: TaskType }
  | { mode: "auto-assign" }

function recActionLabel(tag: RecActionTag): string {
  if (tag === "auto-assign")    return "Auto-Assign"
  if (tag === "view-near-limit") return "View"
  if (tag === "view-idle")       return "View Idle"
  if (tag === "view-mixed")      return "View"
  if (typeof tag === "object")   return "Assign Coverage"
  return "Act"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-amber-500",
  "bg-emerald-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500",
]
function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function effectiveQuotaPkg(emp: User) { return emp.dailyQuotaPackages ?? DEFAULT_QUOTA_PACKAGES }
function effectiveQuotaTsk(emp: User) { return emp.dailyQuotaTasks    ?? DEFAULT_QUOTA_TASKS    }

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

  const [quotaPkg,     setQuotaPkg]     = React.useState(String(initial?.dailyQuotaPackages ?? ""))
  const [quotaTsk,     setQuotaTsk]     = React.useState(String(initial?.dailyQuotaTasks ?? ""))
  const [primaryType,  setPrimaryType]  = React.useState<TaskType | "">(initial?.preferredPrimaryTaskType ?? "")
  const [allowedTypes, setAllowedTypes] = React.useState<TaskType[]>(initial?.allowedTaskTypes ?? [])
  const [defaultZone,  setDefaultZone]  = React.useState(initial?.defaultZone ?? "")

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setEmail(initial?.email ?? "")
      setRole(initial?.role ?? "warehouse_employee")
      setActive(initial?.active ?? true)
      setQuotaPkg(String(initial?.dailyQuotaPackages ?? ""))
      setQuotaTsk(String(initial?.dailyQuotaTasks ?? ""))
      setPrimaryType(initial?.preferredPrimaryTaskType ?? "")
      setAllowedTypes(initial?.allowedTaskTypes ?? [])
      setDefaultZone(initial?.defaultZone ?? "")
    }
  }, [open, initial])

  const valid = name.trim().length > 0 && email.trim().length > 0

  const toggleAllowedType = (t: TaskType) =>
    setAllowedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!valid) return
    onSave({
      name: name.trim(),
      email: email.trim(),
      role,
      active,
      dailyQuotaPackages: quotaPkg !== "" ? Number(quotaPkg) : null,
      dailyQuotaTasks: quotaTsk !== "" ? Number(quotaTsk) : null,
      preferredPrimaryTaskType: primaryType || null,
      allowedTaskTypes: allowedTypes.length > 0 ? allowedTypes : null,
      defaultZone: defaultZone.trim() || null,
    })
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <div className="p-6 w-full max-w-lg">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
          {initial ? "Edit Employee" : "Add Employee"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="emp-name">Full Name</Label>
              <Input id="emp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="emp-email">Email</Label>
              <Input id="emp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@co.com" className="mt-1" />
            </div>
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

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Daily Workload Settings
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="emp-quota-pkg">Package Quota / Day</Label>
                <Input id="emp-quota-pkg" type="number" min="1" value={quotaPkg} onChange={e => setQuotaPkg(e.target.value)} placeholder={`Default: ${DEFAULT_QUOTA_PACKAGES}`} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="emp-quota-tsk">Task Quota / Day</Label>
                <Input id="emp-quota-tsk" type="number" min="1" value={quotaTsk} onChange={e => setQuotaTsk(e.target.value)} placeholder={`Default: ${DEFAULT_QUOTA_TASKS}`} className="mt-1" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="emp-primary-type">Primary Task Type</Label>
                <select id="emp-primary-type" value={primaryType} onChange={e => setPrimaryType(e.target.value as TaskType | "")} className="mt-1 w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Any —</option>
                  {ALL_TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="emp-zone">Default Zone</Label>
                <Input id="emp-zone" value={defaultZone} onChange={e => setDefaultZone(e.target.value)} placeholder="e.g. Z-01" className="mt-1" />
              </div>
            </div>
            <div className="mt-3">
              <Label>Allowed Task Types <span className="font-normal text-slate-400">(empty = all)</span></Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ALL_TASK_TYPES.map(t => {
                  const selected = allowedTypes.includes(t)
                  return (
                    <button key={t} type="button" onClick={() => toggleAllowedType(t)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${selected ? TASK_TYPE_BADGE[t] + " border-transparent" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-400"}`}>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-slate-900 text-white hover:bg-slate-800" disabled={!valid || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {initial ? "Save Changes" : "Add Employee"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}

// ── Quota Progress Bar ────────────────────────────────────────────────────────

function QuotaBar({ used, total, label, color, isDefault }: {
  used: number; total: number; label: string; color: string; isDefault?: boolean
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const overloaded = pct >= 90
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {label}
          {isDefault && <span className="ml-1 text-slate-400 dark:text-slate-500">(default)</span>}
        </span>
        <span className={`text-[10px] font-medium ${overloaded ? "text-red-500" : "text-slate-600 dark:text-slate-300"}`}>
          {used}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${overloaded ? "bg-red-500" : color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Action Modal ──────────────────────────────────────────────────────────────

interface ActionModalProps {
  state: ActionModalState | null
  employees: User[]
  tasks: Task[]
  today: string
  onClose: () => void
  onApply: (updates: Array<{ taskId: string; employeeId: string; employeeName: string }>, logMessage?: string) => Promise<void>
}

function ActionModal({ state, employees, tasks, today, onClose, onApply }: ActionModalProps) {
  const [selectedIds,   setSelectedIds]   = React.useState<Set<string>>(new Set())
  const [targetEmpId,   setTargetEmpId]   = React.useState<string>("")
  const [taskAssignees, setTaskAssignees] = React.useState<Record<string, string>>({})
  const [applying,      setApplying]      = React.useState(false)
  // Captured auto-assign plan when modal opens in that mode
  const [autoAssignResult, setAutoAssignResult] = React.useState<AssignmentResult | null>(null)

  // ── Derived data ────────────────────────────────────────────────────────────

  const sourceEmployee = React.useMemo(() => {
    if (!state) return null
    if (state.mode === "assign-work") return employees.find(e => e.id === state.employeeId) ?? null
    if (state.mode === "rebalance")   return employees.find(e => e.id === state.sourceEmployeeId) ?? null
    return null
  }, [state, employees])

  const targetEmployee = React.useMemo(
    () => employees.find(e => e.id === targetEmpId) ?? null,
    [employees, targetEmpId]
  )

  const eligibleForAssign = React.useMemo(() => {
    if (!state || state.mode !== "assign-work" || !sourceEmployee) return []
    const allowed = sourceEmployee.allowedTaskTypes?.length
      ? sourceEmployee.allowedTaskTypes
      : ALL_TASK_TYPES as TaskType[]
    return tasks
      .filter(t =>
        t.status === "pending" && !t.assigneeId &&
        (t.scheduledDate === today || !t.scheduledDate) &&
        allowed.includes(t.type as TaskType)
      )
      .sort((a, b) => {
        const ap = a.type === sourceEmployee.preferredPrimaryTaskType ? 0 : 1
        const bp = b.type === sourceEmployee.preferredPrimaryTaskType ? 0 : 1
        if (ap !== bp) return ap - bp
        const az = sourceEmployee.defaultZone && a.zone === sourceEmployee.defaultZone ? 0 : 1
        const bz = sourceEmployee.defaultZone && b.zone === sourceEmployee.defaultZone ? 0 : 1
        if (az !== bz) return az - bz
        const P: Record<string, number> = { urgent: 0, high: 1, normal: 2 }
        return (P[a.priority] ?? 2) - (P[b.priority] ?? 2)
      })
  }, [state?.mode, sourceEmployee?.id, tasks, today]) // eslint-disable-line react-hooks/exhaustive-deps

  const sourcePending = React.useMemo(() => {
    if (!state || state.mode !== "rebalance" || !sourceEmployee) return []
    return tasks.filter(t =>
      t.assigneeId === sourceEmployee.id && t.status === "pending" &&
      (t.scheduledDate === today || !t.scheduledDate)
    )
  }, [state?.mode, sourceEmployee?.id, tasks, today]) // eslint-disable-line react-hooks/exhaustive-deps

  const rebalanceCandidates = React.useMemo(() => {
    if (!state || state.mode !== "rebalance" || !sourceEmployee || !targetEmployee) return []
    return findRebalanceCandidates(sourceEmployee, targetEmployee, tasks)
  }, [state?.mode, sourceEmployee, targetEmployee, tasks])

  const coverageTasks = React.useMemo(() => {
    if (!state || state.mode !== "coverage") return []
    return tasks.filter(t =>
      t.status === "pending" && !t.assigneeId && t.type === state.taskType &&
      (t.scheduledDate === today || !t.scheduledDate)
    )
  }, [state?.mode, (state as { taskType?: string })?.taskType, tasks, today]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Reset state when modal opens/changes mode
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    setSelectedIds(new Set())
    setTargetEmpId("")
    setTaskAssignees({})
    setApplying(false)
    if (state?.mode === "auto-assign") {
      setAutoAssignResult(buildAssignmentPlan(tasks, employees))
    }
  }, [state?.mode, (state as { employeeId?: string })?.employeeId, (state as { sourceEmployeeId?: string })?.sourceEmployeeId, (state as { taskType?: string })?.taskType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select tasks that fit within remaining capacity for assign-work
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!state || state.mode !== "assign-work" || !sourceEmployee) return
    const load = getEmployeeTodayLoad(sourceEmployee.id, tasks)
    const qPkg = effectiveQuotaPkg(sourceEmployee)
    const qTsk = effectiveQuotaTsk(sourceEmployee)
    let pkgAcc = load.packageCount
    let tskAcc = load.taskCount
    const auto = new Set<string>()
    for (const task of eligibleForAssign) {
      if (tskAcc >= qTsk) break
      const pkg = task.estimatedPackages ?? task.items ?? 0
      if (pkgAcc + pkg > qPkg) continue
      auto.add(task.id)
      pkgAcc += pkg
      tskAcc++
    }
    setSelectedIds(auto)
  }, [state?.mode, sourceEmployee?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select compatible tasks when rebalance target changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!targetEmployee || !state || state.mode !== "rebalance") return
    const load = getEmployeeTodayLoad(targetEmpId, tasks)
    const qPkg = effectiveQuotaPkg(targetEmployee)
    const qTsk = effectiveQuotaTsk(targetEmployee)
    let pkgAcc = load.packageCount
    let tskAcc = load.taskCount
    const auto = new Set<string>()
    for (const task of rebalanceCandidates) {
      if (tskAcc >= qTsk) break
      const pkg = task.estimatedPackages ?? task.items ?? 0
      if (pkgAcc + pkg > qPkg) continue
      auto.add(task.id)
      pkgAcc += pkg
      tskAcc++
    }
    setSelectedIds(auto)
  }, [targetEmpId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleId = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleConfirm = async () => {
    if (applying || !state) return
    setApplying(true)
    try {
      let updates: Array<{ taskId: string; employeeId: string; employeeName: string }> = []
      let logMessage: string | undefined

      if (state.mode === "assign-work" && sourceEmployee) {
        const selected = eligibleForAssign.filter(t => selectedIds.has(t.id))
        updates = selected.map(t => ({ taskId: t.id, employeeId: sourceEmployee.id, employeeName: sourceEmployee.name }))
        const types = [...new Set(selected.map(t => t.type))]
        const typeStr = types.length === 1 ? `${types[0]} ` : ""
        logMessage = `Assigned ${updates.length} ${typeStr}task${updates.length !== 1 ? "s" : ""} to ${sourceEmployee.name.split(" ")[0]}`
      }
      if (state.mode === "rebalance" && sourceEmployee && targetEmployee) {
        updates = rebalanceCandidates
          .filter(t => selectedIds.has(t.id))
          .map(t => ({ taskId: t.id, employeeId: targetEmployee.id, employeeName: targetEmployee.name }))
        logMessage = `Moved ${updates.length} task${updates.length !== 1 ? "s" : ""} from ${sourceEmployee.name.split(" ")[0]} to ${targetEmployee.name.split(" ")[0]}`
      }
      if (state.mode === "coverage") {
        updates = coverageTasks
          .filter(t => taskAssignees[t.id])
          .map(t => ({
            taskId: t.id,
            employeeId: taskAssignees[t.id],
            employeeName: employees.find(e => e.id === taskAssignees[t.id])?.name ?? "",
          }))
        logMessage = `Assigned coverage for ${updates.length} ${state.taskType} task${updates.length !== 1 ? "s" : ""}`
      }
      if (state.mode === "auto-assign" && autoAssignResult) {
        updates = autoAssignResult.proposed.map(p => ({
          taskId: p.taskId, employeeId: p.employeeId, employeeName: p.employeeName,
        }))
        const empCount = new Set(updates.map(u => u.employeeId)).size
        logMessage = `Auto-assigned ${updates.length} task${updates.length !== 1 ? "s" : ""} across ${empCount} employee${empCount !== 1 ? "s" : ""}`
      }

      await onApply(updates, logMessage)
    } finally {
      setApplying(false)
    }
  }

  if (!state) return null

  // Title + confirm button label
  let title = ""
  let confirmLabel = "Apply"
  let canConfirm = false

  if (state.mode === "assign-work" && sourceEmployee) {
    title = `Assign Work — ${sourceEmployee.name}`
    confirmLabel = `Assign ${selectedIds.size} Task${selectedIds.size !== 1 ? "s" : ""}`
    canConfirm = selectedIds.size > 0
  } else if (state.mode === "rebalance" && sourceEmployee) {
    title = `Rebalance — ${sourceEmployee.name}`
    confirmLabel = targetEmployee
      ? `Move ${selectedIds.size} Task${selectedIds.size !== 1 ? "s" : ""} to ${targetEmployee.name}`
      : "Select a target employee"
    canConfirm = selectedIds.size > 0 && !!targetEmployee
  } else if (state.mode === "coverage") {
    const n = Object.values(taskAssignees).filter(Boolean).length
    title = `Assign ${state.taskType} Tasks`
    confirmLabel = `Assign ${n} Task${n !== 1 ? "s" : ""}`
    canConfirm = n > 0
  } else if (state.mode === "auto-assign") {
    title = "Auto-Assign Today's Work"
    const n = autoAssignResult?.proposed.length ?? 0
    confirmLabel = `Apply ${n} Assignment${n !== 1 ? "s" : ""}`
    canConfirm = n > 0
  }

  const eligibleEmployeesForType = (type: TaskType) =>
    employees.filter(e => {
      if (!e.active) return false
      const allowed = e.allowedTaskTypes?.length ? e.allowedTaskTypes : ALL_TASK_TYPES as TaskType[]
      return allowed.includes(type)
    })

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <div className="p-6 w-full max-w-xl flex flex-col" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4 shrink-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">

          {/* ── Assign-Work Panel ── */}
          {state.mode === "assign-work" && sourceEmployee && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {eligibleForAssign.length === 0
                  ? "No unassigned tasks match this employee's eligible task types today."
                  : `${eligibleForAssign.length} eligible task${eligibleForAssign.length !== 1 ? "s" : ""} today. Tasks within remaining capacity are pre-selected.`
                }
              </p>
              {eligibleForAssign.map(task => {
                const pkg = task.estimatedPackages ?? task.items ?? 0
                const checked = selectedIds.has(task.id)
                const isPrimary = task.type === sourceEmployee.preferredPrimaryTaskType
                return (
                  <label key={task.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${checked ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleId(task.id)} className="shrink-0 accent-blue-600" />
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TASK_TYPE_BADGE[task.type as TaskType] ?? ""}`}>{task.type}</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-mono flex-1 truncate">{task.id}</span>
                    {task.zone && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">{task.zone}</span>}
                    {pkg > 0 && <span className="text-[10px] text-slate-500 shrink-0">{pkg} pkg</span>}
                    {isPrimary && <span className="text-[10px] text-amber-500 shrink-0">★</span>}
                  </label>
                )
              })}
              {eligibleForAssign.length > 1 && (
                <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <button
                    onClick={() => setSelectedIds(selectedIds.size === eligibleForAssign.length ? new Set() : new Set(eligibleForAssign.map(t => t.id)))}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedIds.size === eligibleForAssign.length ? "Deselect All" : "Select All"}
                  </button>
                  <span>{selectedIds.size} selected</span>
                </div>
              )}
            </>
          )}

          {/* ── Rebalance Panel ── */}
          {state.mode === "rebalance" && sourceEmployee && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                <span className="font-medium text-slate-700 dark:text-slate-200">{sourceEmployee.name}</span>
                {" "}has {sourcePending.length} pending task{sourcePending.length !== 1 ? "s" : ""} today.
                Select a target employee to see which tasks can be moved.
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Move pending tasks to</label>
                <select
                  value={targetEmpId}
                  onChange={e => setTargetEmpId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select employee —</option>
                  {employees
                    .filter(e => e.active && e.id !== sourceEmployee.id)
                    .map(e => {
                      const load = getEmployeeTodayLoad(e.id, tasks)
                      const remaining = Math.max(0, effectiveQuotaPkg(e) - load.packageCount)
                      return (
                        <option key={e.id} value={e.id}>
                          {e.name} — {remaining} pkg remaining
                        </option>
                      )
                    })
                  }
                </select>
              </div>

              {targetEmployee && (
                rebalanceCandidates.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No compatible tasks — {targetEmployee.name}&apos;s allowed types don&apos;t overlap with {sourceEmployee.name}&apos;s pending work.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      {rebalanceCandidates.length} compatible task{rebalanceCandidates.length !== 1 ? "s" : ""} — pre-selected to fit {targetEmployee.name}&apos;s remaining capacity.
                    </p>
                    {rebalanceCandidates.map(task => {
                      const pkg = task.estimatedPackages ?? task.items ?? 0
                      const checked = selectedIds.has(task.id)
                      return (
                        <label key={task.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${checked ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleId(task.id)} className="shrink-0 accent-indigo-600" />
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TASK_TYPE_BADGE[task.type as TaskType] ?? ""}`}>{task.type}</span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-mono flex-1 truncate">{task.id}</span>
                          {task.zone && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{task.zone}</span>}
                          {pkg > 0 && <span className="text-[10px] text-slate-500 shrink-0">{pkg} pkg</span>}
                        </label>
                      )
                    })}
                  </>
                )
              )}
            </>
          )}

          {/* ── Coverage Panel ── */}
          {state.mode === "coverage" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {coverageTasks.length === 0
                    ? `No unassigned ${state.taskType} tasks today.`
                    : `${coverageTasks.length} unassigned ${state.taskType} task${coverageTasks.length !== 1 ? "s" : ""} — assign each to an eligible employee.`
                  }
                </p>
                <button
                  onClick={() => { onClose(); navigateToTasks({ type: state.taskType, date: "unassigned_today" }) }}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 ml-3"
                >
                  View all in Tasks <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {(() => {
                const eligible = eligibleEmployeesForType(state.taskType as TaskType)
                if (coverageTasks.length > 0 && eligible.length === 0) {
                  return (
                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        No active employees can handle <strong>{state.taskType}</strong> tasks. Edit an employee and add <strong>{state.taskType}</strong> to their allowed task types.
                      </p>
                    </div>
                  )
                }
                return (
                  <>
                    {coverageTasks.map(task => {
                      const pkg = task.estimatedPackages ?? task.items ?? 0
                      return (
                        <div key={task.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TASK_TYPE_BADGE[state.taskType as TaskType] ?? ""}`}>{state.taskType}</span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-mono flex-1 truncate">{task.id}</span>
                          {task.zone && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{task.zone}</span>}
                          {pkg > 0 && <span className="text-[10px] text-slate-500 shrink-0">{pkg} pkg</span>}
                          <select
                            value={taskAssignees[task.id] ?? ""}
                            onChange={e => setTaskAssignees(prev => ({ ...prev, [task.id]: e.target.value }))}
                            className="h-8 pl-2 pr-6 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                          >
                            <option value="">Assign to…</option>
                            {eligible.map(e => {
                              const rem = Math.max(0, effectiveQuotaPkg(e) - getEmployeeTodayLoad(e.id, tasks).packageCount)
                              return <option key={e.id} value={e.id}>{e.name} ({rem} pkg rem.)</option>
                            })}
                          </select>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </>
          )}

          {/* ── Auto-Assign Panel ── */}
          {state.mode === "auto-assign" && (
            autoAssignResult === null ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Computing plan…
              </div>
            ) : autoAssignResult.proposed.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No assignments can be made — no unassigned tasks exist, or no employee has remaining capacity.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {autoAssignResult.proposed.length} task{autoAssignResult.proposed.length !== 1 ? "s" : ""} will be assigned.
                  {autoAssignResult.unassignable.length > 0 && ` ${autoAssignResult.unassignable.length} could not be assigned (no eligible employee with capacity).`}
                </p>
                {Object.entries(
                  autoAssignResult.proposed.reduce((acc, p) => {
                    acc[p.employeeId] = acc[p.employeeId] ?? { name: p.employeeName, tasks: [] }
                    acc[p.employeeId].tasks.push(p)
                    return acc
                  }, {} as Record<string, { name: string; tasks: ProposedAssignment[] }>)
                ).map(([empId, { name, tasks: empTasks }]) => (
                  <div key={empId} className="mb-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      {name} <span className="font-normal text-slate-400">({empTasks.length} task{empTasks.length !== 1 ? "s" : ""})</span>
                    </p>
                    {empTasks.map(p => (
                      <div key={p.taskId} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-700/30 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TASK_TYPE_BADGE[p.taskType] ?? ""}`}>{p.taskType}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono flex-1 truncate">{p.taskId}</span>
                        {p.zone && <span className="text-[10px] text-slate-400 shrink-0">{p.zone}</span>}
                        <span className="text-[10px] text-slate-400 italic truncate max-w-32 shrink-0">{p.reason}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )
          )}
        </div>

        {/* Warnings */}
        {canConfirm && (() => {
          const warnings: string[] = []
          if (state.mode === "assign-work" && sourceEmployee) {
            if (!isQuotaConfigured(sourceEmployee))
              warnings.push("This employee uses default quotas — quotas may not reflect actual capacity.")
            const selected = eligibleForAssign.filter(t => selectedIds.has(t.id))
            const zoneMismatched = selected.filter(t => t.zone && sourceEmployee.defaultZone && t.zone !== sourceEmployee.defaultZone)
            if (zoneMismatched.length > 0)
              warnings.push(`${zoneMismatched.length} task${zoneMismatched.length !== 1 ? "s" : ""} are outside ${sourceEmployee.name.split(" ")[0]}'s default zone.`)
            const typeCount = new Set(selected.map(t => t.type)).size
            if (typeCount >= 3)
              warnings.push("Assigning 3+ task types may fragment focus — consider prioritising fewer types.")
          }
          if (state.mode === "rebalance" && targetEmployee && !isQuotaConfigured(targetEmployee))
            warnings.push("Target employee uses default quotas — available capacity estimate may be inaccurate.")
          if (warnings.length === 0) return null
          return (
            <div className="mt-3 space-y-1.5 shrink-0">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">{w}</p>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Footer */}
        <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={applying}>Cancel</Button>
          <Button
            type="button"
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            disabled={!canConfirm || applying}
            onClick={handleConfirm}
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeesManagement() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [employees,      setEmployees]      = React.useState<User[]>([])
  const [tasks,          setTasks]          = React.useState<Task[]>([])
  const [loading,        setLoading]        = React.useState(true)
  const [search,         setSearch]         = React.useState("")
  const [roleFilter,     setRoleFilter]     = React.useState<RoleFilterTab>("all")
  const [workloadFilter, setWorkloadFilter] = React.useState<WorkloadFilter>("all")
  const [sortBy,         setSortBy]         = React.useState<SortBy>("name")
  const [modalOpen,      setModalOpen]      = React.useState(false)
  const [editing,        setEditing]        = React.useState<User | undefined>()
  const [saving,         setSaving]         = React.useState(false)
  const [deletingId,     setDeletingId]     = React.useState<string | null>(null)
  const [expandedId,     setExpandedId]     = React.useState<string | null>(null)
  const [actionModal,    setActionModal]    = React.useState<ActionModalState | null>(null)
  const [sessionLog,     setSessionLog]     = React.useState<SessionLogEntry[]>([])

  const tenantId = selectedTenant?.id ?? "tenant-1"
  const today = todayDateString()

  React.useEffect(() => {
    setLoading(true)
    Promise.all([
      api.users.getUsersByTenant(tenantId),
      api.tasks.getTasksByTenant(tenantId),
    ]).then(([userData, taskData]) => {
      setEmployees(userData.filter(u => WAREHOUSE_ROLES.includes(u.role)))
      setTasks(taskData)
      setLoading(false)
    })
  }, [api, tenantId])

  // ── Per-employee metrics ──────────────────────────────────────────────────

  const empMetrics = React.useMemo(() => {
    const map = new Map<string, {
      taskCount: number; packageCount: number; focus: TaskFocus
      qPkg: number; qTsk: number; isDefault: boolean
      isOverloaded: boolean; isNearLimit: boolean; isIdle: boolean
      remainingPkg: number; todayTasks: Task[]
    }>()

    for (const emp of employees) {
      const { taskCount, packageCount } = getEmployeeTodayLoad(emp.id, tasks)
      const qPkg = effectiveQuotaPkg(emp)
      const qTsk = effectiveQuotaTsk(emp)
      const pctPkg = qPkg > 0 ? packageCount / qPkg : 0
      const pctTsk = qTsk > 0 ? taskCount / qTsk : 0
      const isNearLimit  = emp.active && (pctPkg >= 0.9 || pctTsk >= 0.9)
      const isOverloaded = emp.active && (pctPkg >= 1   || pctTsk >= 1)

      const todayTasks = tasks.filter(t =>
        t.assigneeId === emp.id && t.status !== "completed" &&
        (t.scheduledDate === today || (!t.scheduledDate && t.status === "pending"))
      )

      map.set(emp.id, {
        taskCount, packageCount, focus: classifyTaskFocus(todayTasks),
        qPkg, qTsk, isDefault: !isQuotaConfigured(emp),
        isOverloaded, isNearLimit, isIdle: taskCount === 0,
        remainingPkg: Math.max(0, qPkg - packageCount),
        todayTasks,
      })
    }
    return map
  }, [employees, tasks, today])

  // ── Derived board metrics ─────────────────────────────────────────────────

  const counts = {
    total:   employees.length,
    active:  employees.filter(e => e.active).length,
    staff:   employees.filter(e => e.role === "warehouse_employee").length,
    packers: employees.filter(e => e.role === "packer").length,
  }

  const todayAllTasks = tasks.filter(t =>
    t.scheduledDate === today || (!t.scheduledDate && t.status === "pending")
  )
  const unassignedToday  = todayAllTasks.filter(t => !t.assigneeId && t.status !== "completed").length
  const assignedToday    = todayAllTasks.filter(t => !!t.assigneeId).length
  const overloadedCount  = employees.filter(e => empMetrics.get(e.id)?.isOverloaded).length
  const withCapacity     = employees.filter(e => e.active && !empMetrics.get(e.id)?.isIdle && !empMetrics.get(e.id)?.isOverloaded).length

  const unassignedByType  = React.useMemo(() => getUnassignedByType(tasks), [tasks])
  const recommendations   = React.useMemo(() => generateLaborRecommendations(employees, tasks), [employees, tasks])

  // ── Filtered + sorted list ────────────────────────────────────────────────

  const finalList = React.useMemo(() => {
    let list = employees.filter(e => {
      const matchRole   = roleFilter === "all" || e.role === roleFilter
      const matchSearch = search === "" ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
      if (!matchRole || !matchSearch) return false
      if (!e.active) return workloadFilter === "all"
      const m = empMetrics.get(e.id)
      if (!m) return true
      switch (workloadFilter) {
        case "with-capacity": return m.remainingPkg > 0 && !m.isNearLimit
        case "near-limit":    return m.isNearLimit && !m.isOverloaded
        case "overloaded":    return m.isOverloaded
        case "idle":          return m.isIdle
        case "mixed":         return m.focus === "Split" || m.focus === "Fragmented"
        default:              return true
      }
    })

    list = [...list.filter(e => e.active), ...list.filter(e => !e.active)]

    list.sort((a, b) => {
      const ma = empMetrics.get(a.id)
      const mb = empMetrics.get(b.id)
      switch (sortBy) {
        case "most-loaded":     return (mb?.packageCount ?? 0) - (ma?.packageCount ?? 0)
        case "most-capacity":   return (mb?.remainingPkg ?? 0) - (ma?.remainingPkg ?? 0)
        case "most-fragmented": {
          const rank: Record<TaskFocus, number> = { Fragmented: 0, Split: 1, Focused: 2, Idle: 3 }
          return (rank[ma?.focus ?? "Idle"]) - (rank[mb?.focus ?? "Idle"])
        }
        default: return a.name.localeCompare(b.name)
      }
    })
    return list
  }, [employees, roleFilter, search, workloadFilter, sortBy, empMetrics])

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

  const addLog = React.useCallback((message: string) => {
    setSessionLog(prev => [...prev.slice(-2), { message, ts: Date.now() }])
  }, [])

  const handleApplyAction = React.useCallback(async (
    updates: Array<{ taskId: string; employeeId: string; employeeName: string }>,
    logMessage?: string
  ) => {
    if (updates.length === 0) { setActionModal(null); return }
    const now = new Date().toISOString()
    await Promise.all(updates.map(u =>
      api.tasks.updateTask(u.taskId, {
        assigneeId: u.employeeId,
        assignee:   u.employeeName,
        scheduledDate: today,
        assignedAt: now,
      }, tenantId)
    ))
    setTasks(prev => prev.map(t => {
      const u = updates.find(x => x.taskId === t.id)
      if (!u) return t
      return { ...t, assigneeId: u.employeeId, assignee: u.employeeName, scheduledDate: t.scheduledDate ?? today, assignedAt: now }
    }))
    if (logMessage) {
      addLog(logMessage)
    } else {
      const byEmp: Record<string, string> = {}
      for (const u of updates) byEmp[u.employeeId] = u.employeeName
      const empNames = Object.values(byEmp)
      const empSummary = empNames.length <= 2 ? empNames.join(" & ") : `${empNames[0]} +${empNames.length - 1}`
      addLog(`Assigned ${updates.length} task${updates.length !== 1 ? "s" : ""} to ${empSummary}`)
    }
    setActionModal(null)
  }, [api, today, addLog])

  const handleRecAction = (tag: RecActionTag) => {
    if (tag === "auto-assign")     { setActionModal({ mode: "auto-assign" }); return }
    if (tag === "view-near-limit") { setWorkloadFilter("near-limit"); return }
    if (tag === "view-idle")       { setWorkloadFilter("idle"); return }
    if (tag === "view-mixed")      { setWorkloadFilter("mixed"); return }
    if (typeof tag === "object" && tag.mode === "coverage") {
      setActionModal({ mode: "coverage", taskType: tag.taskType })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Employees</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Warehouse staff — daily workload &amp; assignment</p>
        </div>
        <Button onClick={openAdd} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      {/* Today Labor Board */}
      <Card className="dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Today Labor Board
          </p>

          {/* All inactive warning */}
          {employees.length > 0 && counts.active === 0 && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              All warehouse employees are inactive — tasks cannot be assigned until at least one is activated.
            </div>
          )}

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.active}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active Today</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${unassignedToday > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {unassignedToday}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Unassigned Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{assignedToday}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assigned Tasks</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${overloadedCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
                {overloadedCount > 0 ? `${overloadedCount} / ` : ""}{withCapacity}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {overloadedCount > 0 ? "Overloaded / Available" : "With Capacity"}
              </p>
            </div>
          </div>

          {/* Coverage gaps — clickable */}
          {Object.keys(unassignedByType).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">Unassigned by type:</span>
              {(Object.entries(unassignedByType) as [TaskType, number][]).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setActionModal({ mode: "coverage", taskType: type })}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-opacity hover:opacity-80 cursor-pointer ${TASK_TYPE_BADGE[type]}`}
                  title={`Assign ${type} tasks`}
                >
                  {type}
                  <span className="font-bold">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recommendations with action buttons */}
          {recommendations.length > 0 ? (
            <div className="space-y-2">
              {recommendations.map((rec, i) => {
                const style = REC_STYLE[rec.severity]
                const RecIcon = style.icon
                return (
                  <div key={i} className={`flex items-start gap-2.5 pl-3 border-l-2 ${style.border}`}>
                    <RecIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${style.iconColor}`} />
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex-1">{rec.message}</p>
                    {rec.action && (
                      <button
                        onClick={() => handleRecAction(rec.action!)}
                        className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
                      >
                        {recActionLabel(rec.action)}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">All clear — no labor actions needed for today.</p>
          )}
        </CardContent>
      </Card>

      {/* Session log */}
      {sessionLog.length > 0 && (
        <SessionLogBanner entries={sessionLog} onClear={() => setSessionLog([])} />
      )}

      {/* Role filter + Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
            {ROLE_FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  roleFilter === tab.id
                    ? "border-blue-600 text-blue-700 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                  {tab.id === "all" ? employees.length : employees.filter(e => e.role === tab.id).length}
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

        {/* Workload filter pills + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {WORKLOAD_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setWorkloadFilter(f.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  workloadFilter === f.id
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="h-8 pl-3 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="name">Sort: Name</option>
              <option value="most-loaded">Sort: Most Loaded</option>
              <option value="most-capacity">Sort: Most Capacity</option>
              <option value="most-fragmented">Sort: Most Fragmented</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : finalList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-medium text-slate-500 dark:text-slate-400">No employees match this filter</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {search || workloadFilter !== "all" ? "Try clearing the filters" : "Add your first employee to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {finalList.map(emp => {
            const m = empMetrics.get(emp.id)!
            const { taskCount, packageCount, focus, qPkg, qTsk, isDefault, isNearLimit, isOverloaded } = m
            const focusSig = FOCUS_SIGNAL[focus]
            const isExpanded = expandedId === emp.id

            // Can we assign work to this employee?
            const allowed = emp.allowedTaskTypes?.length ? emp.allowedTaskTypes : ALL_TASK_TYPES as TaskType[]
            const hasUnassignedForEmp = emp.active && !isOverloaded &&
              allowed.some(t => (unassignedByType[t] ?? 0) > 0)

            // Can we rebalance FROM this employee?
            const canRebalance = emp.active && (isOverloaded || focus === "Fragmented") &&
              m.todayTasks.some(t => t.status === "pending")

            // All today-relevant tasks for detail panel (includes completed for full picture)
            const empAllTodayTasks = tasks.filter(t =>
              t.assigneeId === emp.id && (
                t.scheduledDate === today ||
                (!t.scheduledDate && (t.status === "pending" || t.status === "in_progress"))
              )
            )

            return (
              <Card
                key={emp.id}
                className={`dark:border-slate-700 transition-all ${!emp.active ? "opacity-60" : ""} ${isOverloaded ? "border-red-200 dark:border-red-800" : isNearLimit ? "border-amber-200 dark:border-amber-800" : ""}`}
              >
                <CardContent className="p-0 dark:bg-slate-800">
                  {/* Card header row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(emp.name)}`}>
                      {initials(emp.name)}
                    </div>

                    {/* Name / role / focus signal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{emp.name}</p>
                        <Badge className={`${ROLE_COLOR[emp.role]} border-0 font-medium text-xs`}>
                          {ROLE_LABEL[emp.role]}
                        </Badge>
                        {emp.active && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${focusSig.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${focusSig.dot}`} />
                            {focusSig.label}
                          </span>
                        )}
                        {isOverloaded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-2.5 w-2.5" /> Overloaded
                          </span>
                        )}
                        {!isOverloaded && isNearLimit && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-2.5 w-2.5" /> Near limit
                          </span>
                        )}
                        {!emp.active && (
                          <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{emp.email}</p>
                    </div>

                    {/* Quota bars */}
                    {emp.active && (
                      <div className="hidden md:flex flex-col gap-1.5 w-44 shrink-0">
                        <QuotaBar used={packageCount} total={qPkg} label="Packages" color="bg-blue-500"   isDefault={isDefault} />
                        <QuotaBar used={taskCount}    total={qTsk} label="Tasks"    color="bg-indigo-500" isDefault={isDefault} />
                      </div>
                    )}

                    {/* Preferred type + zone */}
                    <div className="hidden lg:flex flex-col gap-1 text-right shrink-0">
                      {emp.preferredPrimaryTaskType ? (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${TASK_TYPE_BADGE[emp.preferredPrimaryTaskType]}`}>
                          {emp.preferredPrimaryTaskType}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Any type</span>
                      )}
                      {emp.defaultZone && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Zone: {emp.defaultZone}</span>
                      )}
                    </div>

                    {/* Icon actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                        title="Today's workload"
                      >
                        <BarChart2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                        title={emp.active ? "Deactivate" : "Activate"}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${emp.active ? "text-emerald-500" : ""}`} />
                      </button>
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
                  </div>

                  {/* Mobile quota bars */}
                  {emp.active && (
                    <div className="md:hidden px-5 pb-3 flex flex-col gap-1.5">
                      <QuotaBar used={packageCount} total={qPkg} label="Packages" color="bg-blue-500"   isDefault={isDefault} />
                      <QuotaBar used={taskCount}    total={qTsk} label="Tasks"    color="bg-indigo-500" isDefault={isDefault} />
                    </div>
                  )}

                  {/* Quick action buttons */}
                  {(hasUnassignedForEmp || canRebalance) && (
                    <div className="px-5 pb-3 flex gap-2 flex-wrap">
                      {hasUnassignedForEmp && (
                        <button
                          onClick={() => setActionModal({ mode: "assign-work", employeeId: emp.id })}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Assign Work
                        </button>
                      )}
                      {canRebalance && (
                        <button
                          onClick={() => setActionModal({ mode: "rebalance", sourceEmployeeId: emp.id })}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Rebalance
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expanded workload inspector */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 bg-slate-50/50 dark:bg-slate-700/20">
                      {/* Summary strip */}
                      <div className={`grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg border ${
                        isOverloaded
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                          : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                      }`}>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">Task Focus</p>
                          <p className={`text-xs font-semibold ${isOverloaded ? "text-red-600 dark:text-red-400" : focusSig.text}`}>
                            {isOverloaded ? "Overloaded" : focusSig.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">Pkg Remaining</p>
                          <p className={`text-xs font-semibold ${isOverloaded ? "text-red-600 dark:text-red-400" : isNearLimit ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"}`}>
                            {Math.max(0, qPkg - packageCount)} of {qPkg}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">Quota</p>
                          <p className={`text-xs font-semibold ${isDefault ? "text-slate-400 italic" : "text-slate-700 dark:text-slate-300"}`}>
                            {isDefault ? "Default" : "Configured"}
                          </p>
                        </div>
                      </div>

                      {/* Allowed types */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(emp.allowedTaskTypes ?? ALL_TASK_TYPES).map(t => (
                          <span key={t} className={`text-[10px] font-medium px-2 py-0.5 rounded ${TASK_TYPE_BADGE[t]} ${emp.preferredPrimaryTaskType === t ? "ring-2 ring-offset-1 ring-current" : ""}`}>
                            {t}{emp.preferredPrimaryTaskType === t ? " ★" : ""}
                          </span>
                        ))}
                        {isDefault && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">· default quotas</span>
                        )}
                      </div>

                      {/* Tasks by status */}
                      {empAllTodayTasks.length === 0 ? (
                        <div className="py-1">
                          {!emp.active ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">Inactive — not receiving task assignments.</p>
                          ) : hasUnassignedForEmp ? (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900/40">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No tasks assigned yet today</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Unassigned work exists that matches their task types.</p>
                                <button
                                  onClick={() => setActionModal({ mode: "assign-work", employeeId: emp.id })}
                                  className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <UserPlus className="h-3 w-3" /> Assign work now
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-500 shrink-0" />
                              <p className="text-xs text-slate-400 dark:text-slate-500">Available and idle — no pending work in the queue for their task types.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(["in_progress", "pending", "completed"] as const).map(status => {
                            const statusTasks = empAllTodayTasks.filter(t => t.status === status)
                            if (statusTasks.length === 0) return null
                            const statusLabel = { in_progress: "In Progress", pending: "Pending", completed: "Completed" }[status]
                            const statusColor = { in_progress: "text-amber-600 dark:text-amber-400", pending: "text-slate-500 dark:text-slate-400", completed: "text-emerald-600 dark:text-emerald-400" }[status]
                            return (
                              <div key={status}>
                                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${statusColor}`}>
                                  {statusLabel} ({statusTasks.length})
                                </p>
                                {statusTasks.map(task => {
                                  const pkg = task.estimatedPackages ?? task.items ?? 0
                                  return (
                                    <div key={task.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TASK_TYPE_BADGE[task.type as TaskType] ?? ""}`}>
                                        {task.type}
                                      </span>
                                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono flex-1 truncate">{task.id}</span>
                                      {task.zone && (
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded shrink-0">{task.zone}</span>
                                      )}
                                      {pkg > 0 && <span className="text-[10px] text-slate-400 shrink-0">{pkg} pkg</span>}
                                      {task.priority && task.priority !== "normal" && (
                                        <span className={`text-[10px] font-medium shrink-0 ${task.priority === "urgent" ? "text-red-500" : "text-amber-500"}`}>
                                          {task.priority}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Bottom CTAs */}
                      <div className="mt-3 flex items-center flex-wrap gap-3">
                        {hasUnassignedForEmp && (
                          <button
                            onClick={() => setActionModal({ mode: "assign-work", employeeId: emp.id })}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <UserPlus className="h-3 w-3" /> Assign more work to {emp.name.split(" ")[0]}
                          </button>
                        )}
                        <button
                          onClick={() => navigateToTasks({ employee: emp.id, date: "assigned_today" })}
                          className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 ml-auto"
                        >
                          View in Tasks <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit/Add Form Modal */}
      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
        saving={saving}
      />

      {/* Action Modal */}
      <ActionModal
        state={actionModal}
        employees={employees}
        tasks={tasks}
        today={today}
        onClose={() => setActionModal(null)}
        onApply={handleApplyAction}
      />
    </div>
  )
}
