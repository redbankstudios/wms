/**
 * Smart Task Assignment Service
 *
 * Assigns unassigned tasks for today to active warehouse employees following
 * these rules:
 *  1. Only active warehouse roles (warehouse_manager, warehouse_employee, packer).
 *  2. Prefer employee's preferredPrimaryTaskType first; spill into other
 *     allowedTaskTypes only when primary capacity is exhausted.
 *  3. Respect dailyQuotaPackages (package-based cap) when task has estimatedPackages;
 *     fall back to dailyQuotaTasks (count-based cap) when not.
 *  4. If both quotas are null, use DEFAULT_QUOTA_PACKAGES (50) or DEFAULT_QUOTA_TASKS (10).
 *  5. Prefer same zone as employee.defaultZone to reduce walking.
 *  6. Re-running is idempotent: only unassigned pending tasks are candidates.
 *  7. In-progress and completed tasks are never re-assigned.
 */

import { Task, TaskType, User } from "@/types"

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_QUOTA_PACKAGES = 50
export const DEFAULT_QUOTA_TASKS = 10

/** Roles eligible to receive task assignments. */
const ASSIGNABLE_ROLES = new Set(["warehouse_manager", "warehouse_employee", "packer"])

/** All task types — used as fallback when allowedTaskTypes is null/empty. */
const ALL_TASK_TYPES: TaskType[] = ["Receive", "Putaway", "Pick", "Pack", "Return"]

// ── Date helper ───────────────────────────────────────────────────────────────

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Today task selectors ──────────────────────────────────────────────────────

/**
 * Tasks that belong to today.
 * - scheduledDate === today, OR
 * - no scheduledDate AND status is pending (unscheduled queue items)
 * Excludes completed tasks.
 */
export function getTodayTasks(tasks: Task[]): Task[] {
  const today = todayDateString()
  return tasks.filter(t =>
    t.status !== "completed" &&
    (
      t.scheduledDate === today ||
      (!t.scheduledDate && t.status === "pending")
    )
  )
}

/** Unassigned tasks for today (pending + no assigneeId). */
export function getUnassignedTodayTasks(tasks: Task[]): Task[] {
  return getTodayTasks(tasks).filter(t => !t.assigneeId)
}

// ── Workload helpers ──────────────────────────────────────────────────────────

/**
 * Compute active workload for an employee today.
 *
 * Counts:
 * - tasks scheduled for today (pending or in_progress — not completed)
 * - unscheduled PENDING tasks (in-queue work with no date)
 *
 * Excludes:
 * - completed tasks (work done, no longer consuming capacity)
 * - in_progress unscheduled tasks (ambiguous — treated as prior day carry-over)
 */
export function getEmployeeTodayLoad(
  employeeId: string,
  tasks: Task[]
): { taskCount: number; packageCount: number; dominantType: TaskType | null } {
  const today = todayDateString()
  const active = tasks.filter(
    t =>
      t.assigneeId === employeeId &&
      t.status !== "completed" &&
      (
        t.scheduledDate === today ||
        (!t.scheduledDate && t.status === "pending")
      )
  )

  const taskCount    = active.length
  const packageCount = active.reduce((sum, t) => sum + (t.estimatedPackages ?? t.items ?? 0), 0)

  // Dominant type = most frequent task type in today's active assignments
  const typeCounts: Record<string, number> = {}
  for (const t of active) typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1
  const dominantType = (
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  ) as TaskType | null

  return { taskCount, packageCount, dominantType }
}

/** Remaining daily capacity for an employee. */
export function getEmployeeRemainingCapacity(
  employee: User,
  tasks: Task[]
): { remainingPackages: number | null; remainingTasks: number | null } {
  const { taskCount, packageCount } = getEmployeeTodayLoad(employee.id, tasks)

  const quotaPkg = employee.dailyQuotaPackages ?? null
  const quotaTsk = employee.dailyQuotaTasks ?? null

  const remainingPackages = quotaPkg !== null ? Math.max(0, quotaPkg - packageCount) : null
  const remainingTasks    = quotaTsk !== null ? Math.max(0, quotaTsk - taskCount)    : null

  return { remainingPackages, remainingTasks }
}

/**
 * True if this employee has capacity for one more task with `additionalPkg` packages.
 *
 * Quota resolution order:
 * 1. If BOTH quotas are null → use DEFAULT_QUOTA_PACKAGES.
 * 2. If quotaPkg is set AND additionalPkg > 0 → check package cap.
 * 3. If quotaTsk is set → check task count cap.
 * 4. Fallback: DEFAULT_QUOTA_TASKS.
 */
function hasCapacity(
  employee: User,
  currentLoad: { taskCount: number; packageCount: number },
  additionalPkg: number
): boolean {
  const quotaPkg = employee.dailyQuotaPackages ?? null
  const quotaTsk = employee.dailyQuotaTasks ?? null

  if (quotaPkg === null && quotaTsk === null) {
    // No quotas configured — use package default
    return currentLoad.packageCount + additionalPkg <= DEFAULT_QUOTA_PACKAGES
  }

  if (quotaPkg !== null && additionalPkg > 0) {
    // Package-based cap
    return currentLoad.packageCount + additionalPkg <= quotaPkg
  }

  if (quotaTsk !== null) {
    // Task-count-based cap
    return currentLoad.taskCount < quotaTsk
  }

  // quotaPkg is set but task has no meaningful package count → use task default as safety
  return currentLoad.taskCount < DEFAULT_QUOTA_TASKS
}

// ── Assignment Engine ─────────────────────────────────────────────────────────

export interface ProposedAssignment {
  taskId: string
  employeeId: string
  employeeName: string
  taskType: TaskType
  zone: string | null
  estimatedPackages: number | null
  reason: string
}

export interface AssignmentResult {
  proposed: ProposedAssignment[]
  unassignable: string[]  // task IDs that couldn't be assigned
}

/**
 * Build a proposed assignment plan for today's unassigned pending tasks.
 * Pure function — does NOT write to the database.
 * Call `applyAssignments` to persist.
 *
 * Only targets PENDING unassigned tasks scheduled today (or unscheduled).
 * Does NOT reassign in_progress or already-assigned tasks.
 */
export function buildAssignmentPlan(
  tasks: Task[],
  employees: User[],
  opts?: { taskType?: TaskType; zone?: string }
): AssignmentResult {
  const today = todayDateString()
  const activeEmployees = employees.filter(e => e.active && ASSIGNABLE_ROLES.has(e.role))

  // Candidates: only unassigned PENDING tasks for today
  let candidates = tasks.filter(
    t =>
      t.status === "pending" &&
      !t.assigneeId &&
      (t.scheduledDate === today || !t.scheduledDate)
  )

  if (opts?.taskType) candidates = candidates.filter(t => t.type === opts.taskType)
  if (opts?.zone)     candidates = candidates.filter(t => t.zone === opts.zone)

  // Build mutable load tracker seeded from current real assignments
  const load: Record<string, { taskCount: number; packageCount: number }> = {}
  for (const emp of activeEmployees) {
    const { taskCount, packageCount } = getEmployeeTodayLoad(emp.id, tasks)
    load[emp.id] = { taskCount, packageCount }
  }

  const proposed: ProposedAssignment[] = []
  const assignedIds = new Set<string>()  // tracks tasks assigned in this plan

  for (const emp of activeEmployees) {
    const allowed = emp.allowedTaskTypes?.length ? emp.allowedTaskTypes : ALL_TASK_TYPES
    const primary = emp.preferredPrimaryTaskType ?? null

    // ── Pass 1: primary task type ───────────────────────────────────────────
    if (primary && allowed.includes(primary)) {
      const primaryCandidates = sortCandidates(
        candidates.filter(t => t.type === primary && !assignedIds.has(t.id)),
        emp
      )

      for (const task of primaryCandidates) {
        const pkg = task.estimatedPackages ?? task.items ?? 0
        if (!hasCapacity(emp, load[emp.id], pkg)) continue  // skip this task, try next
        const reason = buildReason(task, emp, "primary")
        proposed.push({
          taskId: task.id,
          employeeId: emp.id,
          employeeName: emp.name,
          taskType: task.type,
          zone: task.zone ?? null,
          estimatedPackages: task.estimatedPackages ?? null,
          reason,
        })
        assignedIds.add(task.id)
        load[emp.id].taskCount++
        load[emp.id].packageCount += pkg
      }
    }

    // ── Pass 2: secondary task types (only if capacity remains) ────────────
    const secondaryTypes = allowed.filter(t => t !== primary)
    if (secondaryTypes.length === 0) continue

    // Check if ANY capacity still remains before assigning secondary types
    const hasAnyCapacity = hasCapacity(emp, load[emp.id], 0)
    if (!hasAnyCapacity) continue

    const secondaryCandidates = sortCandidates(
      candidates.filter(t => secondaryTypes.includes(t.type) && !assignedIds.has(t.id)),
      emp
    )

    for (const task of secondaryCandidates) {
      const pkg = task.estimatedPackages ?? task.items ?? 0
      if (!hasCapacity(emp, load[emp.id], pkg)) continue  // skip, try smaller task
      const reason = buildReason(task, emp, "secondary")
      proposed.push({
        taskId: task.id,
        employeeId: emp.id,
        employeeName: emp.name,
        taskType: task.type,
        zone: task.zone ?? null,
        estimatedPackages: task.estimatedPackages ?? null,
        reason,
      })
      assignedIds.add(task.id)
      load[emp.id].taskCount++
      load[emp.id].packageCount += pkg
    }
  }

  const unassignable = candidates.filter(t => !assignedIds.has(t.id)).map(t => t.id)

  return { proposed, unassignable }
}

/** Build a human-readable reason for a proposed assignment. */
function buildReason(task: Task, emp: User, pass: "primary" | "secondary"): string {
  const parts: string[] = []
  if (pass === "primary") {
    parts.push(`preferred type: ${task.type}`)
  } else {
    parts.push(`secondary type: ${task.type}`)
  }
  if (emp.defaultZone && task.zone === emp.defaultZone) {
    parts.push(`same zone (${task.zone})`)
  }
  if (task.priority === "urgent") parts.push("urgent priority")
  else if (task.priority === "high") parts.push("high priority")
  return parts.join(" · ")
}

/**
 * Sort candidate tasks for a given employee:
 *  1. Matching employee's defaultZone first (reduces walking)
 *  2. Priority (urgent > high > normal)
 *  3. Earliest createdAt (FIFO)
 */
function sortCandidates(tasks: Task[], emp: User): Task[] {
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 }
  return [...tasks].sort((a, b) => {
    const aZone = emp.defaultZone && a.zone === emp.defaultZone ? 0 : 1
    const bZone = emp.defaultZone && b.zone === emp.defaultZone ? 0 : 1
    if (aZone !== bZone) return aZone - bZone

    const ap = PRIORITY_RANK[a.priority] ?? 2
    const bp = PRIORITY_RANK[b.priority] ?? 2
    if (ap !== bp) return ap - bp

    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
  })
}

// ── Labor board helpers ───────────────────────────────────────────────────────

export type TaskFocus = "Focused" | "Split" | "Fragmented" | "Idle"

/** Count tasks by type for a given task list. */
export function countTaskTypes(tasks: Task[]): Partial<Record<TaskType, number>> {
  const counts: Partial<Record<TaskType, number>> = {}
  for (const t of tasks) counts[t.type as TaskType] = (counts[t.type as TaskType] ?? 0) + 1
  return counts
}

/**
 * Classify an employee's task focus for today based on active (non-completed) task types.
 * Pass the employee's active-today tasks (not completed).
 */
export function classifyTaskFocus(activeTasks: Task[]): TaskFocus {
  const types = new Set(activeTasks.map(t => t.type))
  if (types.size === 0) return "Idle"
  if (types.size === 1) return "Focused"
  if (types.size === 2) return "Split"
  return "Fragmented"
}

/** True if the employee has at least one explicit quota configured. */
export function isQuotaConfigured(emp: User): boolean {
  return emp.dailyQuotaPackages != null || emp.dailyQuotaTasks != null
}

/** Unassigned pending tasks for today, grouped by task type. */
export function getUnassignedByType(tasks: Task[]): Partial<Record<TaskType, number>> {
  const today = todayDateString()
  const unassigned = tasks.filter(
    t => t.status === "pending" && !t.assigneeId && (t.scheduledDate === today || !t.scheduledDate)
  )
  return countTaskTypes(unassigned)
}

export type RecActionTag =
  | "auto-assign"
  | "view-near-limit"
  | "view-idle"
  | "view-mixed"
  | { mode: "coverage"; taskType: TaskType }

export interface LaborRecommendation {
  severity: "info" | "warning" | "action"
  message: string
  action?: RecActionTag
}

/**
 * Generate up to 5 deterministic, rule-based labor recommendations for today.
 * Rules (in priority order): unassigned tasks, near-capacity, idle employees,
 * uncovered task types, fragmented employees.
 */
export function generateLaborRecommendations(
  employees: User[],
  tasks: Task[]
): LaborRecommendation[] {
  const recs: LaborRecommendation[] = []
  const today = todayDateString()
  const activeWarehouse = employees.filter(e => e.active && ASSIGNABLE_ROLES.has(e.role))

  // 1. Unassigned tasks today
  const unassigned = tasks.filter(
    t => t.status === "pending" && !t.assigneeId && (t.scheduledDate === today || !t.scheduledDate)
  )
  if (unassigned.length >= 3) {
    recs.push({ severity: "action", message: `${unassigned.length} tasks are unassigned today — run Auto-Assign to distribute work.`, action: "auto-assign" })
  } else if (unassigned.length > 0) {
    recs.push({ severity: "warning", message: `${unassigned.length} task${unassigned.length > 1 ? "s" : ""} unassigned today.`, action: "auto-assign" })
  }

  // 2. Near-capacity or overloaded employees
  const nearLimit = activeWarehouse.filter(e => {
    const { taskCount, packageCount } = getEmployeeTodayLoad(e.id, tasks)
    const qPkg = e.dailyQuotaPackages ?? DEFAULT_QUOTA_PACKAGES
    const qTsk = e.dailyQuotaTasks ?? DEFAULT_QUOTA_TASKS
    return packageCount >= qPkg * 0.9 || taskCount >= qTsk * 0.9
  })
  if (nearLimit.length > 0) {
    recs.push({ severity: "warning", message: `${nearLimit.length} employee${nearLimit.length > 1 ? "s are" : " is"} near or at capacity today.`, action: "view-near-limit" })
  }

  // 3. Idle employees (no tasks today)
  const idle = activeWarehouse.filter(e => getEmployeeTodayLoad(e.id, tasks).taskCount === 0)
  if (idle.length > 0) {
    recs.push({ severity: "info", message: `${idle.length} active employee${idle.length > 1 ? "s have" : " has"} no tasks assigned today.`, action: "view-idle" })
  }

  // 4. Unassigned task types with no employee coverage
  const unassignedByType = getUnassignedByType(tasks)
  const uncoveredEntries: { type: TaskType; count: number }[] = []
  for (const [type, count] of Object.entries(unassignedByType) as [TaskType, number][]) {
    if (!count) continue
    const hasCoverage = activeWarehouse.some(e =>
      tasks.some(t =>
        t.assigneeId === e.id && t.type === type && t.status !== "completed" &&
        (t.scheduledDate === today || (!t.scheduledDate && t.status === "pending"))
      )
    )
    if (!hasCoverage) uncoveredEntries.push({ type, count })
  }
  if (uncoveredEntries.length > 0) {
    const typeStr = uncoveredEntries.map(e => `${e.type} (${e.count})`).join(", ")
    recs.push({
      severity: "warning",
      message: `Unassigned work with no coverage: ${typeStr}.`,
      action: { mode: "coverage", taskType: uncoveredEntries[0].type },
    })
  }

  // 5. Fragmented employees
  const fragmented = activeWarehouse.filter(e => {
    const empTasks = tasks.filter(
      t => t.assigneeId === e.id && t.status !== "completed" &&
        (t.scheduledDate === today || (!t.scheduledDate && t.status === "pending"))
    )
    return classifyTaskFocus(empTasks) === "Fragmented"
  })
  if (fragmented.length > 0) {
    recs.push({ severity: "info", message: `${fragmented.length} employee${fragmented.length > 1 ? "s have" : " has"} 3+ task types today — consider consolidating assignments.`, action: "view-mixed" })
  }

  const SEVERITY_RANK: Record<LaborRecommendation["severity"], number> = { action: 0, warning: 1, info: 2 }
  return recs.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]).slice(0, 5)
}

// ── Assignment Engine ─────────────────────────────────────────────────────────

/**
 * Apply a proposed assignment plan by calling updateTask for each assignment.
 * Each assignment is attempted independently — a single failure does not abort the rest.
 * Returns the count of successfully applied assignments.
 */
export async function applyAssignments(
  proposed: ProposedAssignment[],
  updateTask: (taskId: string, updates: Partial<Omit<Task, "id">>) => Promise<void>,
  taskMap: Record<string, Task>,
  employeeMap: Record<string, User>
): Promise<number> {
  const today = todayDateString()
  let count = 0

  for (const p of proposed) {
    const task     = taskMap[p.taskId]
    const employee = employeeMap[p.employeeId]
    if (!task || !employee) continue

    try {
      await updateTask(p.taskId, {
        assigneeId:    p.employeeId,
        assignee:      p.employeeName,
        scheduledDate: task.scheduledDate ?? today,
        assignedAt:    new Date().toISOString(),
      })
      count++
    } catch {
      // Log and continue — partial success is better than full abort
      console.warn(`[taskAssignmentService] Failed to assign task ${p.taskId} to ${p.employeeName}`)
    }
  }

  return count
}

/**
 * Return pending tasks from `sourceEmployee` that are compatible with `targetEmployee`
 * (match target's allowed types). Sorted: target's preferred type first, then zone match,
 * then priority. Does NOT filter by capacity — caller decides how many to take.
 */
export function findRebalanceCandidates(
  sourceEmployee: User,
  targetEmployee: User,
  tasks: Task[]
): Task[] {
  const today = todayDateString()
  const targetAllowed = new Set<string>(
    targetEmployee.allowedTaskTypes?.length ? targetEmployee.allowedTaskTypes : ALL_TASK_TYPES
  )

  const candidates = tasks.filter(t =>
    t.assigneeId === sourceEmployee.id &&
    t.status === "pending" &&
    (t.scheduledDate === today || !t.scheduledDate) &&
    targetAllowed.has(t.type)
  )

  const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 }
  return [...candidates].sort((a, b) => {
    const ap = a.type === targetEmployee.preferredPrimaryTaskType ? 0 : 1
    const bp = b.type === targetEmployee.preferredPrimaryTaskType ? 0 : 1
    if (ap !== bp) return ap - bp

    const az = targetEmployee.defaultZone && a.zone === targetEmployee.defaultZone ? 0 : 1
    const bz = targetEmployee.defaultZone && b.zone === targetEmployee.defaultZone ? 0 : 1
    if (az !== bz) return az - bz

    return (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2)
  })
}
