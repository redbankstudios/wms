"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock, Loader2, CheckCircle2, PlayCircle, Package,
  ArrowDownToLine, RefreshCcw, ClipboardList, Plus, X, UserCog,
  MapPin, Hash, ShoppingCart, Pencil, Trash2,
} from "lucide-react"
import { Task, User } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

const TYPE_CARD_STYLE: Record<string, string> = {
  Receive: "border-l-4 border-l-blue-400",
  Putaway: "border-l-4 border-l-cyan-400",
  Pick: "border-l-4 border-l-amber-400",
  Pack: "border-l-4 border-l-purple-400",
  Return: "border-l-4 border-l-rose-400",
}

const TYPE_BADGE: Record<string, string> = {
  Receive: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Putaway: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Pick: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Pack: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Return: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  Receive: ArrowDownToLine,
  Putaway: Package,
  Pick: ClipboardList,
  Pack: Package,
  Return: RefreshCcw,
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  normal: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
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

const TASK_TYPES = ["all", "Receive", "Putaway", "Pick", "Pack", "Return"] as const
const PRIORITIES = ["all", "urgent", "high", "normal"] as const
const TASK_TYPE_OPTIONS = ["Receive", "Putaway", "Pick", "Pack", "Return"] as const
const PRIORITY_OPTIONS = ["normal", "high", "urgent"] as const

// Active (selected) state per type — solid, matches card border color
const TYPE_FILTER_ACTIVE: Record<string, string> = {
  Receive: "bg-blue-500 text-white border-blue-500",
  Putaway: "bg-cyan-500 text-white border-cyan-500",
  Pick:    "bg-amber-500 text-white border-amber-500",
  Pack:    "bg-purple-500 text-white border-purple-500",
  Return:  "bg-rose-500 text-white border-rose-500",
}

// Inactive (unselected) state per type — muted, matches card badge
const TYPE_FILTER_INACTIVE: Record<string, string> = {
  Receive: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40",
  Putaway: "bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800 dark:hover:bg-cyan-900/40",
  Pick:    "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/40",
  Pack:    "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/40",
  Return:  "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/40",
}

interface TaskFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (task: Omit<Task, "id">) => void
  initial?: Task | null
  users: User[]
  tenantId: string
}

function TaskFormModal({ open, onClose, onSave, initial, users, tenantId }: TaskFormModalProps) {
  const [type, setType] = React.useState<Task["type"]>(initial?.type ?? "Pick")
  const [location, setLocation] = React.useState(initial?.location ?? "")
  const [items, setItems] = React.useState(String(initial?.items ?? "1"))
  const [priority, setPriority] = React.useState<Task["priority"]>(initial?.priority ?? "normal")
  const [assigneeId, setAssigneeId] = React.useState(initial?.assigneeId ?? "")
  const [orderId, setOrderId] = React.useState(initial?.orderId ?? "")

  React.useEffect(() => {
    if (open) {
      setType(initial?.type ?? "Pick")
      setLocation(initial?.location ?? "")
      setItems(String(initial?.items ?? "1"))
      setPriority(initial?.priority ?? "normal")
      setAssigneeId(initial?.assigneeId ?? "")
      setOrderId(initial?.orderId ?? "")
    }
  }, [open, initial])

  if (!open) return null

  const activeUsers = users.filter(u => u.active)
  const selectedUser = activeUsers.find(u => u.id === assigneeId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const assignee = selectedUser?.name ?? "Unassigned"
    onSave({
      tenantId,
      type,
      status: initial?.status ?? "pending",
      assignee,
      assigneeId: assigneeId || undefined,
      orderId: orderId || undefined,
      location,
      items: parseInt(items) || 1,
      priority,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as Task["type"])}
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {TASK_TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
                <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_", " ")})</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Zone A • Aisle 04"
              required
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Items + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Items</label>
              <input
                type="number"
                min="1"
                value={items}
                onChange={e => setItems(e.target.value)}
                required
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Task["priority"])}
                className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Order ID (optional) */}
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

// Inline assignee dropdown shown on task card
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

export function TaskCenter() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [draggedId, setDraggedId] = React.useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = React.useState<string | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)

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

  async function moveTask(taskId: string, newStatus: Task["status"]) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try { await api.tasks.updateTaskStatus(taskId, newStatus) } catch { /* demo */ }
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
      }
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updates } : t))
      try { await api.tasks.updateTask(editingTask.id, updates) } catch { /* demo */ }
    } else {
      const newTask = await api.tasks.createTask(taskData)
      setTasks(prev => [newTask, ...prev])
    }
  }

  async function handleAssign(taskId: string, userId: string, userName: string) {
    const updates = { assigneeId: userId || undefined, assignee: userName }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    try { await api.tasks.updateTask(taskId, updates) } catch { /* demo */ }
  }

  async function handleDelete(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try { await api.tasks.deleteTask(taskId) } catch { /* demo */ }
  }

  const filtered = tasks.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const columns: { id: Task["status"]; title: string; dot: string }[] = [
    { id: "pending", title: "Pending", dot: "bg-slate-400" },
    { id: "in_progress", title: "In Progress", dot: "bg-amber-400" },
    { id: "completed", title: "Completed", dot: "bg-emerald-500" },
  ]

  const statCards = [
    { label: "Total Tasks", value: tasks.length, color: "text-slate-800 dark:text-white", bg: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" },
    { label: "Pending", value: tasks.filter(t => t.status === "pending").length, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800" },
    { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" },
    { label: "Completed", value: tasks.filter(t => t.status === "completed").length, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800" },
  ]

  return (
    <>
      <div className="space-y-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Task Center</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {users.filter(u => u.active).length} active staff • {tasks.filter(t => t.assignee === "Unassigned").length} unassigned tasks
            </p>
          </div>
          <Button onClick={() => { setEditingTask(null); setModalOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />New Task
          </Button>
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

        {/* Filters */}
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
                : isActive
                  ? TYPE_FILTER_ACTIVE[t]
                  : TYPE_FILTER_INACTIVE[t]
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${cls}`}
                >
                  {TypeIcon && <TypeIcon className="h-3 w-3" />}
                  {t === "all" ? "All" : t}
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
                    : p === "high" ? "bg-orange-500 text-white"
                    : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {(typeFilter !== "all" || priorityFilter !== "all") && (
            <button
              onClick={() => { setTypeFilter("all"); setPriorityFilter("all") }}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 pb-4 min-h-[420px]">
            {columns.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id)
              return (
                <div key={col.id} className="w-80 shrink-0 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300">{col.title}</h3>
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
                      return (
                        <Card
                          key={task.id}
                          className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-white dark:bg-slate-800 ${TYPE_CARD_STYLE[task.type] || ""} ${draggedId === task.id ? "opacity-40 ring-2 ring-blue-400" : ""}`}
                          draggable
                          onDragStart={() => setDraggedId(task.id)}
                          onDragEnd={() => setDraggedId(null)}
                        >
                          <CardContent className="p-0">
                            {/* Card header: type + priority + task ID */}
                            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${TYPE_BADGE[task.type] || "bg-slate-100 text-slate-700"}`}>
                                  <TypeIcon className="h-2.5 w-2.5" />
                                  {task.type}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_BADGE[task.priority] || "bg-slate-100 text-slate-500"}`}>
                                  {task.priority}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{task.id}</span>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100 dark:border-slate-700 mx-4" />

                            {/* Body: all fields */}
                            <div className="px-4 py-3 space-y-2">
                              {/* Location */}
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 font-mono">
                                  {task.location}
                                </span>
                              </div>

                              {/* Items */}
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                  <span className="font-semibold">{task.items}</span> item{task.items !== 1 ? "s" : ""} to {task.type.toLowerCase()}
                                </span>
                              </div>

                              {/* Order ID */}
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-3 w-3 text-slate-400 shrink-0" />
                                {task.orderId ? (
                                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">
                                    {task.orderId}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">No order linked</span>
                                )}
                              </div>

                              {/* Task ID row */}
                              <div className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-400 dark:text-slate-500">{task.id}</span>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100 dark:border-slate-700 mx-4" />

                            {/* Assignee row */}
                            <div className="px-4 py-2.5 flex items-center gap-2">
                              <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center ${assigneeName === "Unassigned" ? "bg-slate-200 dark:bg-slate-600" : avatarColor(assigneeName)}`}>
                                <span className="text-[9px] font-bold text-white">{initials(assigneeName)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${assigneeName === "Unassigned" ? "text-slate-400 dark:text-slate-500 italic" : "text-slate-700 dark:text-slate-200"}`}>
                                  {assigneeName}
                                </p>
                                {assigneeUser && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                                    {assigneeUser.role.replace(/_/g, " ")}
                                  </p>
                                )}
                              </div>
                              <AssigneePicker task={task} users={users} onAssign={handleAssign} iconOnly />
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100 dark:border-slate-700 mx-4" />

                            {/* Action footer */}
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-3"
                                    onClick={() => moveTask(task.id, "in_progress")}
                                  >
                                    <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Start
                                  </Button>
                                )}
                                {task.status === "in_progress" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                    onClick={() => moveTask(task.id, "completed")}
                                  >
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
    </>
  )
}
