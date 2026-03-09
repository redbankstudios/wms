"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock, Loader2, CheckCircle2, PlayCircle, Package,
  ArrowDownToLine, RefreshCcw, ClipboardList, Plus, X, UserCog,
  MapPin, ShoppingCart, Pencil, Trash2, Zap, CalendarDays,
  AlertTriangle, ChevronDown, Users, Square, CheckSquare,
} from "lucide-react"
import { Task, TaskType, User } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"
import {
  buildAssignmentPlan,
  applyAssignments,
  todayDateString,
  getUnassignedTodayTasks,
} from "@/services/taskAssignmentService"

// ── Styles ────────────────────────────────────────────────────────────────────

const TYPE_CARD_STYLE: Record<string, string> = {
  Receive: "border-l-4 border-l-blue-400",
  Putaway: "border-l-4 border-l-cyan-400",
  Pick:    "border-l-4 border-l-amber-400",
  Pack:    "border-l-4 border-l-purple-400",
  Return:  "border-l-4 border-l-rose-400",
}

const TYPE_BADGE: Record<string, string> = {
  Receive: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Putaway: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Pick:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Pack:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Return:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
}

const TYPE_FILTER_ACTIVE: Record<string, string> = {
  Receive: "bg-blue-500 text-white border-blue-500",
  Putaway: "bg-cyan-500 text-white border-cyan-500",
  Pick:    "bg-amber-500 text-white border-amber-500",
  Pack:    "bg-purple-500 text-white border-purple-500",
  Return:  "bg-rose-500 text-white border-rose-500",
}

const TYPE_FILTER_INACTIVE: Record<string, string> = {
  Receive: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40",
  Putaway: "bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800 dark:hover:bg-cyan-900/40",
  Pick:    "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/40",
  Pack:    "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/40",
  Return:  "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/40",
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  normal: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  Receive: ArrowDownToLine,
  Putaway: Package,
  Pick:    ClipboardList,
  Pack:    Package,
  Return:  RefreshCcw,
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_TYPES = ["all", "Receive", "Putaway", "Pick", "Pack", "Return"] as const
const PRIORITIES = ["all", "urgent", "high", "normal"] as const
const TASK_TYPE_OPTIONS: TaskType[] = ["Receive", "Putaway", "Pick", "Pack", "Return"]
const PRIORITY_OPTIONS = ["normal", "high", "urgent"] as const

type DateFilter = "all" | "today" | "unassigned_today" | "assigned_today"
const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all",              label: "All Tasks"        },
  { id: "today",            label: "Today"            },
  { id: "unassigned_today", label: "Unassigned Today" },
  { id: "assigned_today",   label: "Assigned Today"   },
]

// ── Session Log ───────────────────────────────────────────────────────────────

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

// ── Assignment reason ─────────────────────────────────────────────────────────

function deriveAssignmentReason(task: Task, users: User[]): string | null {
  if (!task.assigneeId) return null
  const user = users.find(u => u.id === task.assigneeId)
  if (!user) return null
  const hints: string[] = []
  if (user.preferredPrimaryTaskType === task.type) hints.push("preferred type")
  if (user.defaultZone && task.zone && user.defaultZone === task.zone) hints.push("zone match")
  return hints.length > 0 ? hints.join(" · ") : null
}

// ── Bulk Action Bar ───────────────────────────────────────────────────────────

function BulkActionBar({ selectedIds, tasks, employees, onAssign, onUnassign, onClear }: {
  selectedIds: Set<string>
  tasks: Task[]
  employees: User[]
  onAssign: (empId: string, empName: string) => void
  onUnassign: () => void
  onClear: () => void
}) {
  const [assignTo, setAssignTo] = React.useState("")
  const selectedTasks = tasks.filter(t => selectedIds.has(t.id))
  // Only pending tasks are actionable
  const pendingCount = selectedTasks.filter(t => t.status === "pending").length
  const totalPkg = selectedTasks.filter(t => t.status === "pending").reduce((s, t) => s + (t.estimatedPackages ?? t.items ?? 0), 0)
  const emp = employees.find(e => e.id === assignTo)
  const skipped = selectedIds.size - pendingCount
  if (selectedIds.size === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
      <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 shrink-0">
        {pendingCount} pending
        {totalPkg > 0 && <span className="font-normal"> · {totalPkg} pkg</span>}
        {skipped > 0 && <span className="font-normal text-slate-400"> · {skipped} non-pending ignored</span>}
      </span>
      <div className="flex-1 min-w-[1rem]" />
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            disabled={pendingCount === 0}
            className="h-8 pl-3 pr-7 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-40"
          >
            <option value="">Assign to…</option>
            {employees.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
        </div>
        <Button size="sm" disabled={!assignTo || pendingCount === 0} onClick={() => { if (emp) { onAssign(emp.id, emp.name); setAssignTo("") } }}>
          Assign
        </Button>
        <Button size="sm" variant="outline" disabled={pendingCount === 0} onClick={onUnassign}>Unassign</Button>
        <button onClick={onClear} className="p-1.5 rounded text-blue-400 hover:text-blue-600 dark:hover:text-blue-200" title="Exit select mode">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Task Form Modal ───────────────────────────────────────────────────────────

interface TaskFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (task: Omit<Task, "id">) => void
  initial?: Task | null
  users: User[]
  tenantId: string
}

function TaskFormModal({ open, onClose, onSave, initial, users, tenantId }: TaskFormModalProps) {
  const today = todayDateString()
  const [type,      setType]      = React.useState<TaskType>(initial?.type ?? "Pick")
  const [location,  setLocation]  = React.useState(initial?.location ?? "")
  const [items,     setItems]     = React.useState(String(initial?.items ?? "1"))
  const [priority,  setPriority]  = React.useState<Task["priority"]>(initial?.priority ?? "normal")
  const [assigneeId, setAssigneeId] = React.useState(initial?.assigneeId ?? "")
  const [orderId,   setOrderId]   = React.useState(initial?.orderId ?? "")
  const [scheduledDate, setScheduledDate] = React.useState(initial?.scheduledDate ?? today)
  const [estimatedPkg,  setEstimatedPkg]  = React.useState(String(initial?.estimatedPackages ?? ""))
  const [zone,      setZone]      = React.useState(initial?.zone ?? "")

  React.useEffect(() => {
    if (open) {
      setType(initial?.type ?? "Pick")
      setLocation(initial?.location ?? "")
      setItems(String(initial?.items ?? "1"))
      setPriority(initial?.priority ?? "normal")
      setAssigneeId(initial?.assigneeId ?? "")
      setOrderId(initial?.orderId ?? "")
      setScheduledDate(initial?.scheduledDate ?? today)
      setEstimatedPkg(String(initial?.estimatedPackages ?? ""))
      setZone(initial?.zone ?? "")
    }
  }, [open, initial, today])

  if (!open) return null

  const activeUsers = users.filter(u => u.active)
  const selectedUser = activeUsers.find(u => u.id === assigneeId)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const assignee = selectedUser?.name ?? "Unassigned"
    onSave({
      tenantId,
      type,
      status: initial?.status ?? "pending",
      assignee,
      assigneeId: assigneeId || null,
      orderId: orderId || null,
      location,
      items: parseInt(items) || 1,
      priority,
      scheduledDate: scheduledDate || today,
      estimatedPackages: estimatedPkg !== "" ? parseInt(estimatedPkg) : null,
      zone: zone.trim() || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TaskType)}
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {TASK_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Task["priority"])}
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assign To</label>
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">— Unassigned —</option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, " ")})</option>
              ))}
            </select>
          </div>

          {/* Location + Zone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Aisle 04 · Shelf B"
                required
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Zone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                value={zone}
                onChange={e => setZone(e.target.value)}
                placeholder="e.g. Z-01"
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Items + Estimated Packages */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Items</label>
              <input
                type="number" min="1"
                value={items}
                onChange={e => setItems(e.target.value)}
                required
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Est. Packages <span className="text-slate-400 font-normal">(for quota)</span>
              </label>
              <input
                type="number" min="0"
                value={estimatedPkg}
                onChange={e => setEstimatedPkg(e.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Order ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Order ID <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. ORD-5001"
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{initial ? "Save Changes" : "Create Task"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Inline Assignee Picker ────────────────────────────────────────────────────

interface AssigneePickerProps {
  task: Task
  users: User[]
  onAssign: (taskId: string, userId: string, userName: string) => void
  iconOnly?: boolean
}

function AssigneePicker({ task, users, onAssign, iconOnly }: AssigneePickerProps) {
  const [open, setOpen] = React.useState(false)
  const activeUsers = users.filter(u => u.active)
  const assigneeName = task.assignee || "Unassigned"
  const color = assigneeName === "Unassigned" ? "bg-slate-300" : avatarColor(assigneeName)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={iconOnly ? "p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700" : "flex items-center gap-1.5 group"}
        title="Reassign task"
      >
        {iconOnly ? (
          <UserCog className="h-3.5 w-3.5" />
        ) : (
          <>
            <div className={`h-5 w-5 rounded-full ${color} flex items-center justify-center`}>
              <span className="text-[9px] font-bold text-white">{initials(assigneeName)}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px] group-hover:text-slate-700 dark:group-hover:text-slate-200">
              {assigneeName}
            </span>
          </>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[180px]">
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
              onClick={() => { onAssign(task.id, "", "Unassigned"); setOpen(false) }}
            >
              — Unassigned —
            </button>
            {activeUsers.map(u => (
              <button
                key={u.id}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${u.id === task.assigneeId ? "text-blue-600 font-medium" : "text-slate-700 dark:text-slate-300"}`}
                onClick={() => { onAssign(task.id, u.id, u.name); setOpen(false) }}
              >
                <div className={`h-4 w-4 rounded-full ${avatarColor(u.name)} flex items-center justify-center shrink-0`}>
                  <span className="text-[8px] font-bold text-white">{initials(u.name)}</span>
                </div>
                {u.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Auto-assign Preview Modal ─────────────────────────────────────────────────

interface AutoAssignPreviewProps {
  open: boolean
  onClose: () => void
  onApply: () => void
  proposed: ReturnType<typeof buildAssignmentPlan>["proposed"]
  unassignable: string[]
  applying: boolean
}

function AutoAssignPreview({ open, onClose, onApply, proposed, unassignable, applying }: AutoAssignPreviewProps) {
  if (!open) return null

  // Group by employee for a cleaner manager view
  const byEmployee: Record<string, typeof proposed> = {}
  for (const p of proposed) {
    byEmployee[p.employeeId] = byEmployee[p.employeeId] ?? []
    byEmployee[p.employeeId].push(p)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" /> Auto-assign Preview
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {proposed.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing to assign</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                All tasks are already assigned, or no active employees have remaining capacity.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">{proposed.length}</span> task{proposed.length !== 1 ? "s" : ""} across{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{Object.keys(byEmployee).length}</span> employee{Object.keys(byEmployee).length !== 1 ? "s" : ""}:
              </p>

              {/* Grouped by employee */}
              <div className="space-y-3">
                {Object.entries(byEmployee).map(([, assignments]) => {
                  const emp = assignments[0]
                  const totalPkg = assignments.reduce((s, a) => s + (a.estimatedPackages ?? 0), 0)
                  return (
                    <div key={emp.employeeId} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      {/* Employee header */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${avatarColor(emp.employeeName)}`}>
                          {initials(emp.employeeName)}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.employeeName}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {assignments.length} task{assignments.length !== 1 ? "s" : ""}
                          {totalPkg > 0 && ` · ${totalPkg} pkg`}
                        </span>
                      </div>
                      {/* Task rows */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {assignments.map(a => (
                          <div key={a.taskId} className="flex items-center gap-2 px-3 py-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TYPE_BADGE[a.taskType] ?? ""}`}>
                              {a.taskType}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">{a.taskId}</span>
                            {a.zone && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                                {a.zone}
                              </span>
                            )}
                            {a.estimatedPackages != null && (
                              <span className="text-[10px] text-slate-400 shrink-0">{a.estimatedPackages} pkg</span>
                            )}
                            <span className="text-[10px] text-slate-400 italic ml-auto truncate max-w-[160px]">{a.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {unassignable.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">{unassignable.length}</span> task{unassignable.length !== 1 ? "s" : ""} could not be assigned — no active employee has remaining capacity or a matching task type.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={applying}>Cancel</Button>
          <Button
            onClick={onApply}
            disabled={proposed.length === 0 || applying}
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Apply {proposed.length > 0 ? `${proposed.length} ` : ""}Assignment{proposed.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TaskCenter() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()

  const [tasks,      setTasks]      = React.useState<Task[]>([])
  const [users,      setUsers]      = React.useState<User[]>([])
  const [loading,    setLoading]    = React.useState(true)
  const [draggedId,  setDraggedId]  = React.useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = React.useState<string | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all")
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("today")
  const [employeeFilter, setEmployeeFilter] = React.useState<string>("all")
  const [modalOpen,  setModalOpen]  = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [preview, setPreview] = React.useState<ReturnType<typeof buildAssignmentPlan> | null>(null)
  const [applying, setApplying] = React.useState(false)
  const [selectMode,  setSelectMode]  = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [sessionLog,  setSessionLog]  = React.useState<SessionLogEntry[]>([])

  const today = todayDateString()

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [taskData, userData] = await Promise.all([
        api.tasks.getTasksByTenant(selectedTenant.id),
        api.users.getUsersByTenant(selectedTenant.id),
      ])
      setTasks(taskData)
      setUsers(userData)
      setLoading(false)
    }
    loadData()
  }, [api, selectedTenant.id])

  // Sync filters from URL params (deep-link from Employees page)
  React.useEffect(() => {
    const VALID_TYPES  = new Set(["all", "Receive", "Putaway", "Pick", "Pack", "Return"])
    const VALID_DATES  = new Set<string>(["all", "today", "unassigned_today", "assigned_today"])
    function syncFilters() {
      const params = new URLSearchParams(window.location.search)
      if (params.get("tab") !== "tasks") return
      const emp  = params.get("employee")
      const type = params.get("type")
      const date = params.get("date")
      if (emp  !== null) setEmployeeFilter(emp || "all")
      if (type !== null) setTypeFilter(VALID_TYPES.has(type) ? type : "all")
      if (date !== null) setDateFilter((VALID_DATES.has(date) ? date : "today") as DateFilter)
    }
    syncFilters()
    window.addEventListener("popstate", syncFilters)
    return () => window.removeEventListener("popstate", syncFilters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────

  const warehouseUsers = React.useMemo(() =>
    users.filter(u => ["warehouse_manager", "warehouse_employee", "packer"].includes(u.role)),
    [users]
  )

  // Fallback: if URL-supplied employee ID doesn't exist after users load, reset to "all"
  React.useEffect(() => {
    if (employeeFilter === "all" || employeeFilter === "unassigned" || warehouseUsers.length === 0) return
    if (!warehouseUsers.find(u => u.id === employeeFilter)) setEmployeeFilter("all")
  }, [warehouseUsers]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = React.useMemo(() => {
    return tasks.filter(t => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (employeeFilter !== "all") {
        if (employeeFilter === "unassigned" && t.assigneeId) return false
        if (employeeFilter !== "unassigned" && t.assigneeId !== employeeFilter) return false
      }
      if (dateFilter === "today") {
        return t.scheduledDate === today || (!t.scheduledDate && t.status === "pending")
      }
      if (dateFilter === "unassigned_today") {
        const isToday = t.scheduledDate === today || (!t.scheduledDate && t.status === "pending")
        return isToday && !t.assigneeId
      }
      if (dateFilter === "assigned_today") {
        const isToday = t.scheduledDate === today || (!t.scheduledDate && t.status === "pending")
        return isToday && !!t.assigneeId
      }
      return true  // "all"
    })
  }, [tasks, typeFilter, priorityFilter, dateFilter, employeeFilter, today])

  const todayUnassigned = React.useMemo(() => getUnassignedTodayTasks(tasks).length, [tasks])

  // Count tasks per type, respecting all other active filters (for pill counters)
  const countsByType = React.useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach(t => {
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return
      if (employeeFilter !== "all") {
        if (employeeFilter === "unassigned" && t.assigneeId) return
        if (employeeFilter !== "unassigned" && t.assigneeId !== employeeFilter) return
      }
      if (dateFilter === "today") {
        if (!(t.scheduledDate === today || (!t.scheduledDate && t.status === "pending"))) return
      } else if (dateFilter === "unassigned_today") {
        const isToday = t.scheduledDate === today || (!t.scheduledDate && t.status === "pending")
        if (!(isToday && !t.assigneeId)) return
      } else if (dateFilter === "assigned_today") {
        const isToday = t.scheduledDate === today || (!t.scheduledDate && t.status === "pending")
        if (!(isToday && !!t.assigneeId)) return
      }
      counts[t.type] = (counts[t.type] ?? 0) + 1
    })
    return counts
  }, [tasks, priorityFilter, dateFilter, employeeFilter, today])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function moveTask(taskId: string, newStatus: Task["status"]) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try { await api.tasks.updateTaskStatus(taskId, newStatus, selectedTenant.id) } catch { /* demo */ }
  }

  async function handleSaveTask(taskData: Omit<Task, "id">) {
    if (editingTask) {
      const updates: Partial<Omit<Task, "id">> = {
        type: taskData.type,
        assignee: taskData.assignee,
        assigneeId: taskData.assigneeId,
        orderId: taskData.orderId,
        location: taskData.location,
        items: taskData.items,
        priority: taskData.priority,
        scheduledDate: taskData.scheduledDate,
        estimatedPackages: taskData.estimatedPackages,
        zone: taskData.zone,
      }
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updates } : t))
      try { await api.tasks.updateTask(editingTask.id, updates, selectedTenant.id) } catch { /* demo */ }
    } else {
      const newTask = await api.tasks.createTask(taskData)
      setTasks(prev => [newTask, ...prev])
    }
  }

  async function handleAssign(taskId: string, userId: string, userName: string) {
    const updates = { assigneeId: userId || null, assignee: userName }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    try { await api.tasks.updateTask(taskId, updates, selectedTenant.id) } catch { /* demo */ }
  }

  async function handleDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try { await api.tasks.deleteTask(taskId, selectedTenant.id) } catch { /* demo */ }
  }

  const addLog = React.useCallback((message: string) => {
    setSessionLog(prev => [...prev.slice(-2), { message, ts: Date.now() }])
  }, [])

  function handlePreviewAutoAssign() {
    const plan = buildAssignmentPlan(tasks, warehouseUsers)
    setPreview(plan)
    setPreviewOpen(true)
  }

  async function handleApplyAutoAssign() {
    if (!preview) return
    setApplying(true)
    try {
      const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]))
      const empMap  = Object.fromEntries(warehouseUsers.map(e => [e.id, e]))
      await applyAssignments(preview.proposed, (id, u) => api.tasks.updateTask(id, u, selectedTenant.id), taskMap, empMap)

      // Update local state
      const updates: Record<string, { assigneeId: string; assignee: string; scheduledDate: string }> = {}
      for (const p of preview.proposed) {
        updates[p.taskId] = {
          assigneeId: p.employeeId,
          assignee: p.employeeName,
          scheduledDate: taskMap[p.taskId]?.scheduledDate ?? today,
        }
      }
      setTasks(prev => prev.map(t => updates[t.id] ? { ...t, ...updates[t.id] } : t))
      const empCount = new Set(preview.proposed.map(p => p.employeeId)).size
      addLog(`Auto-assigned ${preview.proposed.length} task${preview.proposed.length !== 1 ? "s" : ""} across ${empCount} employee${empCount !== 1 ? "s" : ""}`)
      setPreviewOpen(false)
      setPreview(null)
    } finally {
      setApplying(false)
    }
  }

  async function handleBulkAssign(empId: string, empName: string) {
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const safe    = [...selectedIds].filter(id => taskMap.get(id)?.status === "pending")
    const skipped = selectedIds.size - safe.length
    if (safe.length === 0) {
      addLog(`Nothing to assign — ${skipped > 0 ? "selected tasks are not pending" : "no tasks selected"}`)
      setSelectedIds(new Set()); setSelectMode(false); return
    }
    const updates = { assigneeId: empId, assignee: empName, scheduledDate: today }
    setTasks(prev => prev.map(t => safe.includes(t.id) ? { ...t, ...updates } : t))
    await Promise.all(safe.map(id => api.tasks.updateTask(id, updates, selectedTenant.id).catch(() => {})))
    const msg = skipped > 0
      ? `Assigned ${safe.length} task${safe.length !== 1 ? "s" : ""} to ${empName} · ${skipped} skipped (not pending)`
      : `Assigned ${safe.length} task${safe.length !== 1 ? "s" : ""} to ${empName}`
    addLog(msg)
    setSelectedIds(new Set()); setSelectMode(false)
  }

  async function handleBulkUnassign() {
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const safe    = [...selectedIds].filter(id => taskMap.get(id)?.status === "pending")
    const skipped = selectedIds.size - safe.length
    if (safe.length === 0) {
      addLog(`Nothing to unassign — selected tasks are not pending`)
      setSelectedIds(new Set()); setSelectMode(false); return
    }
    const updates = { assigneeId: null, assignee: "Unassigned" }
    setTasks(prev => prev.map(t => safe.includes(t.id) ? { ...t, ...updates } : t))
    await Promise.all(safe.map(id => api.tasks.updateTask(id, updates, selectedTenant.id).catch(() => {})))
    const msg = skipped > 0
      ? `Unassigned ${safe.length} task${safe.length !== 1 ? "s" : ""} · ${skipped} skipped (not pending)`
      : `Unassigned ${safe.length} pending task${safe.length !== 1 ? "s" : ""}`
    addLog(msg)
    setSelectedIds(new Set()); setSelectMode(false)
  }

  function toggleSelected(taskId: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(taskId) ? n.delete(taskId) : n.add(taskId); return n })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const columns: { id: Task["status"]; title: string; dot: string }[] = [
    { id: "pending",     title: "Pending",     dot: "bg-slate-400"   },
    { id: "in_progress", title: "In Progress", dot: "bg-amber-400"   },
    { id: "completed",   title: "Completed",   dot: "bg-emerald-500" },
  ]

  const statCards = [
    { label: "Total Tasks",  value: tasks.length,                                    color: "text-slate-800 dark:text-white",          bg: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" },
    { label: "Pending",      value: tasks.filter(t => t.status === "pending").length, color: "text-amber-700 dark:text-amber-400",       bg: "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800" },
    { label: "In Progress",  value: tasks.filter(t => t.status === "in_progress").length, color: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" },
    { label: "Completed",    value: tasks.filter(t => t.status === "completed").length, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800" },
  ]

  return (
    <>
      <div className="space-y-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Task Center</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {users.filter(u => u.active).length} active staff &bull; {todayUnassigned} unassigned today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectMode) { setSelectMode(false); setSelectedIds(new Set()) }
                else setSelectMode(true)
              }}
              className={`flex items-center gap-1.5 ${selectMode ? "border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" : ""}`}
            >
              {selectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {selectMode ? `Cancel (${selectedIds.size})` : "Select"}
            </Button>
            <Button
              variant="outline"
              onClick={handlePreviewAutoAssign}
              className="flex items-center gap-1.5"
              title="Auto-assign today's unassigned tasks using employee quotas and preferences"
            >
              <Zap className="h-4 w-4 text-amber-500" />
              Auto-assign Today
            </Button>
            <Button onClick={() => { setEditingTask(null); setModalOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />New Task
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map(s => (
            <Card key={s.label} className={`${s.bg} shadow-none`}>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">{s.label}</span>
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Session log */}
        {sessionLog.length > 0 && (
          <SessionLogBanner entries={sessionLog} onClear={() => setSessionLog([])} />
        )}

        {/* Bulk action bar */}
        {selectMode && (
          <BulkActionBar
            selectedIds={selectedIds}
            tasks={tasks}
            employees={warehouseUsers}
            onAssign={handleBulkAssign}
            onUnassign={handleBulkUnassign}
            onClear={() => { setSelectMode(false); setSelectedIds(new Set()) }}
          />
        )}

        {/* Date + Employee filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400 mx-1.5" />
            {DATE_FILTERS.map(df => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  dateFilter === df.id
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {df.label}
                {df.id === "unassigned_today" && todayUnassigned > 0 && (
                  <span className="ml-1 px-1 py-0 rounded-full text-[9px] bg-amber-500 text-white">{todayUnassigned}</span>
                )}
              </button>
            ))}
          </div>

          <div className="relative">
            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="h-8 pl-7 pr-6 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 appearance-none"
            >
              <option value="all">All Employees</option>
              <option value="unassigned">Unassigned</option>
              {warehouseUsers.filter(u => u.active).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Type + Priority filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-slate-400 mr-1">Type</span>
            {TASK_TYPES.map(t => {
              const TypeIcon = t !== "all" ? TYPE_ICONS[t] : null
              const isActive = typeFilter === t
              const cls = t === "all"
                ? isActive
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-900 dark:border-slate-100"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600"
                : isActive ? TYPE_FILTER_ACTIVE[t] : TYPE_FILTER_INACTIVE[t]
              const typeCount = t === "all" ? null : countsByType[t]
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${cls}`}
                >
                  {TypeIcon && <TypeIcon className="h-3 w-3" />}
                  {t === "all" ? "All" : t}
                  {typeCount != null && typeCount > 0 && (
                    <span className={`ml-0.5 px-1 py-0 rounded-full text-[9px] font-bold leading-4 ${isActive ? "bg-white/30" : "bg-slate-400/20"}`}>
                      {typeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 mr-1">Priority</span>
            {PRIORITIES.map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  priorityFilter === p
                    ? p === "urgent" ? "bg-red-600 text-white"
                    : p === "high"   ? "bg-orange-500 text-white"
                    :                  "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {(typeFilter !== "all" || priorityFilter !== "all" || dateFilter !== "today" || employeeFilter !== "all") && (
            <button
              onClick={() => { setTypeFilter("all"); setPriorityFilter("all"); setDateFilter("today"); setEmployeeFilter("all") }}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Zero-results banner */}
        {tasks.length > 0 && filtered.length === 0 && (
          <div className="flex items-center gap-2 px-1 text-sm text-slate-500 dark:text-slate-400">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            No tasks match the current filters.
            <button
              onClick={() => { setTypeFilter("all"); setPriorityFilter("all"); setDateFilter("today"); setEmployeeFilter("all") }}
              className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No tasks yet</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 mb-4">
                Create your first task to get started managing today&apos;s warehouse work.
              </p>
              <Button onClick={() => { setEditingTask(null); setModalOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" />Create First Task
              </Button>
            </div>
          ) : (
          <div className="flex gap-4 pb-4 min-h-[420px]">
            {columns.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id)
              const allColSelected = colTasks.length > 0 && colTasks.every(t => selectedIds.has(t.id))
              return (
                <div key={col.id} className="w-80 shrink-0 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300">{col.title}</h3>
                      {col.id === "pending" && selectMode && colTasks.length > 0 && (
                        <button
                          onClick={() => setSelectedIds(prev => {
                            const n = new Set(prev)
                            colTasks.forEach(t => allColSelected ? n.delete(t.id) : n.add(t.id))
                            return n
                          })}
                          className="text-[10px] font-medium text-blue-500 dark:text-blue-400 hover:underline"
                        >
                          {allColSelected ? "Deselect all" : "Select all"}
                        </button>
                      )}
                    </div>
                    <Badge variant="secondary">{colTasks.length}</Badge>
                  </div>
                  <div
                    className={`flex-1 space-y-3 rounded-xl p-3 border-2 border-dashed transition-colors min-h-[200px] ${
                      dragOverCol === col.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                        : "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    }`}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => {
                      e.preventDefault()
                      setDragOverCol(null)
                      if (draggedId) moveTask(draggedId, col.id)
                      setDraggedId(null)
                    }}
                  >
                    {colTasks.map(task => {
                      const TypeIcon = TYPE_ICONS[task.type] || ClipboardList
                      const assigneeName = task.assignee || "Unassigned"
                      const assigneeUser = users.find(u => u.id === task.assigneeId)
                      const isUnassigned = !task.assigneeId
                      const isScheduledToday = task.scheduledDate === today || (!task.scheduledDate && task.status === "pending")
                      return (
                        <Card
                          key={task.id}
                          className={`${selectMode && task.status === "pending" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} hover:shadow-md transition-all bg-white dark:bg-slate-800 ${TYPE_CARD_STYLE[task.type] || ""} ${draggedId === task.id ? "opacity-40 ring-2 ring-blue-400" : ""} ${isUnassigned && isScheduledToday ? "ring-1 ring-amber-300 dark:ring-amber-700" : ""} ${selectMode && selectedIds.has(task.id) ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}`}
                          draggable={!selectMode}
                          onDragStart={() => !selectMode && setDraggedId(task.id)}
                          onDragEnd={() => setDraggedId(null)}
                          onClick={() => selectMode && task.status === "pending" && toggleSelected(task.id)}
                        >
                          <CardContent className="p-0">
                            {/* Card header */}
                            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                              <div className="flex items-center gap-1.5">
                                {selectMode && task.status === "pending" && (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(task.id)}
                                    onChange={e => { e.stopPropagation(); toggleSelected(task.id) }}
                                    onClick={e => e.stopPropagation()}
                                    className="accent-blue-600 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                  />
                                )}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${TYPE_BADGE[task.type] || "bg-slate-100 text-slate-700"}`}>
                                  <TypeIcon className="h-2.5 w-2.5" />
                                  {task.type}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_BADGE[task.priority] || ""}`}>
                                  {task.priority}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isScheduledToday && (
                                  <Clock className="h-3 w-3 text-blue-400" aria-label="Scheduled today" />
                                )}
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{task.id}</span>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 mx-4" />

                            {/* Body */}
                            <div className="px-4 py-3 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 font-mono">{task.location}</span>
                                {task.zone && (
                                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-auto">{task.zone}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                  <span className="font-semibold">{task.items}</span> item{task.items !== 1 ? "s" : ""}
                                  {task.estimatedPackages != null && (
                                    <span className="ml-1 text-slate-400">· {task.estimatedPackages} pkg</span>
                                  )}
                                </span>
                              </div>

                              {task.scheduledDate && (
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className={`text-xs font-mono ${task.scheduledDate === today ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                                    {task.scheduledDate === today ? "Today" : task.scheduledDate}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-3 w-3 text-slate-400 shrink-0" />
                                {task.orderId ? (
                                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">{task.orderId}</span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">No order</span>
                                )}
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 mx-4" />

                            {/* Assignee row */}
                            <div className="px-4 py-2.5 flex items-center gap-2">
                              <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center ${isUnassigned ? "bg-slate-200 dark:bg-slate-600" : avatarColor(assigneeName)}`}>
                                <span className="text-[9px] font-bold text-white">{initials(assigneeName)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${isUnassigned ? "text-amber-500 dark:text-amber-400 italic" : "text-slate-700 dark:text-slate-200"}`}>
                                  {isUnassigned ? "Unassigned" : assigneeName}
                                </p>
                                {assigneeUser && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                                    {assigneeUser.role.replace(/_/g, " ")}
                                  </p>
                                )}
                                {(() => {
                                  const reason = deriveAssignmentReason(task, users)
                                  return reason ? (
                                    <p className="text-[10px] text-blue-500 dark:text-blue-400 italic truncate">{reason}</p>
                                  ) : null
                                })()}
                              </div>
                              <AssigneePicker task={task} users={users} onAssign={handleAssign} iconOnly />
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 mx-4" />

                            {/* Footer actions */}
                            <div className="px-3 py-2 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setEditingTask(task); setModalOpen(true) }}
                                  title="Edit task"
                                  className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(task.id)}
                                  title="Delete task"
                                  className="p-1.5 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div>
                                {task.status === "pending" && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => moveTask(task.id, "in_progress")}>
                                    <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Start
                                  </Button>
                                )}
                                {task.status === "in_progress" && (
                                  <Button size="sm" className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600" onClick={() => moveTask(task.id, "completed")}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark Done
                                  </Button>
                                )}
                                {task.status === "completed" && (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" />Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    {colTasks.length === 0 && (
                      <div className="flex h-24 items-center justify-center text-sm text-slate-400 italic select-none">
                        {filtered.length < tasks.length ? "No matching tasks" : "Drop tasks here"}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      </div>

      <TaskFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        onSave={handleSaveTask}
        initial={editingTask}
        users={users}
        tenantId={selectedTenant.id}
      />

      <AutoAssignPreview
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreview(null) }}
        onApply={handleApplyAutoAssign}
        proposed={preview?.proposed ?? []}
        unassignable={preview?.unassignable ?? []}
        applying={applying}
      />
    </>
  )
}
