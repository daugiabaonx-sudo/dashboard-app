// lib/planner/planner-mapping.ts
// Pure mapping between Microsoft Planner resources and the SUNEXT template
// dataset (lib/sx-dashboard.ts), plus the reverse: task-modal edit → Graph
// PATCH body. No server-only imports — the client store uses
// `plannerPatchFromEdit`, the PATCH route uses `mapPlannerTask`.
//
// Dates: Planner stores UTC instants; the team works in Vietnam time, so
// calendar days are computed in Asia/Ho_Chi_Minh, and deadlines are written
// as noon Vietnam time (05:00Z) so they show the same day in any timezone
// between UTC-5 and UTC+14.

import type {
  SxBlocker,
  SxDataset,
  SxEmployee,
  SxHealth,
  SxPriority,
  SxProject,
  SxProjectHealth,
  SxStatus,
  SxTask,
  SxTaskEdit,
} from "@/lib/sx-dashboard";
import type { PlannerMember, PlannerPlanWithGroup, PlannerTask, PlannerTaskPatch } from "./types";

export const PLANNER_UNASSIGNED_ID = "planner-unassigned";
export const BLOCKED_PLANNER_PREFIX = "[Bị chặn] ";

const BLOCKED_TITLE_RE = /^\s*(?:\[(?:bị\s*chặn|blocked|kẹt)\]|(?:bị\s*chặn|blocked|kẹt)\s*:)\s*/i;
const BLOCKED_CATEGORY_RE = /\b(?:block|blocked|bị\s*chặn|kẹt)\b/i;

export function isBlockedPlannerTitle(title: string): boolean {
  return BLOCKED_TITLE_RE.test(title);
}

/**
 * Checks whether any active category label on a Planner task matches a
 * blocked keyword ("BLOCK", "BLOCKED", "Bị chặn", "Kẹt").
 */
export function isBlockedPlannerCategory(
  task: PlannerTask,
  planCategories?: Readonly<Record<string, string | null>>,
): boolean {
  const applied = task.appliedCategories;
  if (!applied) return false;
  for (const [key, active] of Object.entries(applied)) {
    if (!active) continue;
    const label = planCategories?.[key]?.trim() ?? "";
    if (BLOCKED_CATEGORY_RE.test(label)) return true;
  }
  return false;
}

export function stripBlockedPlannerPrefix(title: string): string {
  const stripped = title.replace(BLOCKED_TITLE_RE, "").trim();
  return stripped || title.trim();
}

/**
 * Computes a minimal `{ title }` patch to add or remove the `[Bị chặn] `
 * prefix on a Microsoft Planner task. Returns `null` when no change is needed.
 */
export function blockedTitlePatch(title: string, blocked: boolean): { title: string } | null {
  const currentlyBlocked = isBlockedPlannerTitle(title);
  if (blocked === currentlyBlocked) return null;
  const clean = stripBlockedPlannerPrefix(title);
  return {
    title: (blocked ? `${BLOCKED_PLANNER_PREFIX}${clean}` : clean).slice(0, 255),
  };
}

export const ALLOWED_PLANNER_PLAN_TITLES = [
  "Sunext Manage Task",
  "DEV Manage Task",
  "Marketing Manage Task",
] as const;

export const EXCLUDED_PLANNER_PLAN_TITLES = [
  "test",
  "To do list",
  "General Tasks",
  "Test 1",
] as const;

const normalizePlanTitle = (title: string): string => title.trim().toLowerCase();

const ALLOWED_TITLE_ORDER = new Map<string, number>(
  ALLOWED_PLANNER_PLAN_TITLES.map((title, index) => [normalizePlanTitle(title), index]),
);

const EXCLUDED_TITLES = new Set<string>(
  EXCLUDED_PLANNER_PLAN_TITLES.map(normalizePlanTitle),
);

/**
 * Filters out legacy/test plans (test, To do list, General Tasks, Test 1)
 * and, when any of the 3 active SUNEXT plans are present, keeps only
 * Sunext Manage Task, DEV Manage Task, and Marketing Manage Task in order.
 */
export function filterPlannerPlans<T extends { readonly title: string }>(
  plans: readonly T[],
): T[] {
  const nonExcluded = plans.filter((p) => {
    const normalized = normalizePlanTitle(p.title);
    return normalized.length > 0 && !EXCLUDED_TITLES.has(normalized);
  });
  const allowedMatches = nonExcluded.filter((p) =>
    ALLOWED_TITLE_ORDER.has(normalizePlanTitle(p.title)),
  );
  if (allowedMatches.length === 0) return nonExcluded;
  return [...allowedMatches].sort(
    (a, b) =>
      (ALLOWED_TITLE_ORDER.get(normalizePlanTitle(a.title)) ?? 0) -
      (ALLOWED_TITLE_ORDER.get(normalizePlanTitle(b.title)) ?? 0),
  );
}

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const DEADLINE_UTC_TIME = "T05:00:00Z";
const PROJECT_COLORS = ["#7b2ff2", "#9e83f5", "#17c98b", "#ff7a00", "#8d68df", "#24c6ff", "#ff6170"];
const PRIORITY_TO_PLANNER: Record<SxPriority, number> = { high: 3, medium: 5, low: 9 };
export const OVERDUE_BLOCKED_RATIO = 0.3;
const DAY_MS = 86_400_000;

export interface PlannerSource {
  readonly tenantId: string;
  readonly plans: readonly PlannerPlanWithGroup[];
  readonly tasks: readonly PlannerTask[];
  /** groupId → members of that Microsoft 365 group. */
  readonly members: Readonly<Record<string, readonly PlannerMember[]>>;
  /** Assignees looked up by id (User.Read.All) when member lists lack their name. */
  readonly users?: readonly PlannerMember[];
  /** planId → categoryDescriptions (category1..category25 → label text). */
  readonly planCategories?: Readonly<Record<string, Readonly<Record<string, string | null>>>>;
  /** taskId → task details description (Notes field in Teams Planner). */
  readonly taskNotes?: Readonly<Record<string, string>>;
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of an instant, in Vietnam time. */
function vnDay(instant: string | number): string {
  return dayFormatter.format(new Date(instant));
}

function dayDiffIso(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

const clampPct = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n)));

export function mapPlannerPriority(priority: number): SxPriority {
  if (priority <= 4) return "high";
  return priority <= 7 ? "medium" : "low";
}

export function mapPlannerStatus(
  task: PlannerTask,
  now: number,
  planCategories?: Readonly<Record<string, string | null>>,
): SxStatus {
  if (task.percentComplete >= 100) return "completed";
  if (isBlockedPlannerTitle(task.title) || isBlockedPlannerCategory(task, planCategories)) {
    return "blocked";
  }
  if (task.dueDateTime && vnDay(task.dueDateTime) < vnDay(now)) return "overdue";
  return task.percentComplete > 0 ? "in_progress" : "not_started";
}

export function mapPlannerTask(
  task: PlannerTask,
  now: number,
  planCategories?: Readonly<Record<string, string | null>>,
  notes?: string,
): SxTask {
  const assignee = Object.keys(task.assignments ?? {})[0];
  return {
    id: task.id,
    title: stripBlockedPlannerPrefix(task.title),
    employeeId: assignee ?? PLANNER_UNASSIGNED_ID,
    projectId: task.planId,
    priority: mapPlannerPriority(task.priority),
    status: mapPlannerStatus(task, now, planCategories),
    progress: clampPct(task.percentComplete),
    deadline: task.dueDateTime ? vnDay(task.dueDateTime) : "",
    notes: (notes ?? "").trim(),
    ...(task.createdDateTime ? { createdAt: vnDay(task.createdDateTime) } : {}),
    ...(task.completedDateTime ? { completedAt: vnDay(task.completedDateTime) } : {}),
  };
}

export function plannerPlanUrl(planId: string, tenantId: string): string {
  return `https://planner.cloud.microsoft/webui/plan/${encodeURIComponent(planId)}/view/board?tid=${encodeURIComponent(tenantId)}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

function buildEmployees(src: PlannerSource, tasks: readonly SxTask[]): SxEmployee[] {
  const groupOfPlan = new Map(src.plans.map((p) => [p.id, p]));
  const memberById = new Map<string, PlannerMember>();
  const people = [...Object.values(src.members).flat(), ...(src.users ?? [])];
  for (const m of people) {
    const known = memberById.get(m.id);
    if (!known || (!known.displayName?.trim() && m.displayName?.trim())) memberById.set(m.id, m);
  }

  const order: string[] = [];
  const teamOf = new Map<string, string>();
  for (const t of tasks) {
    if (teamOf.has(t.employeeId)) continue;
    order.push(t.employeeId);
    teamOf.set(t.employeeId, groupOfPlan.get(t.projectId)?.groupName ?? "Planner");
  }

  return order.map((id, i) => {
    const avatar = `avatar-${(i % 5) + 1}`;
    if (id === PLANNER_UNASSIGNED_ID) {
      return { id, name: "Chưa giao", initials: "?", role: "—", team: "—", avatar };
    }
    const m = memberById.get(id);
    const short = id.slice(0, 4);
    const name = m?.displayName?.trim() || `Thành viên ${short}`;
    return {
      id,
      name,
      initials: m?.displayName?.trim() ? initialsOf(name) : short.slice(0, 2).toUpperCase(),
      role: m?.jobTitle?.trim() || "Thành viên",
      team: teamOf.get(id) || m?.department?.trim() || "Planner",
      avatar,
    };
  });
}

function projectHealthOf(planId: string, tasks: readonly SxTask[]): SxProjectHealth {
  const own = tasks.filter((t) => t.projectId === planId);
  const overdue = own.filter((t) => t.status === "overdue").length;
  const blocked = own.filter((t) => t.status === "blocked").length;
  const deadlines = own.map((t) => t.deadline).filter(Boolean).sort();
  let health: SxHealth = "on_track";
  if (blocked > 0 || (overdue > 0 && overdue / own.length >= OVERDUE_BLOCKED_RATIO)) health = "blocked";
  else if (overdue > 0) health = "at_risk";
  return {
    projectId: planId,
    progress: own.length ? Math.round(own.reduce((s, t) => s + t.progress, 0) / own.length) : 0,
    deadline: deadlines.at(-1) ?? "",
    tasksDone: own.filter((t) => t.status === "completed").length,
    tasksTotal: own.length,
    health,
  };
}

/**
 * Derives Blocker & Decision records from incomplete Planner tasks without
 * overlapping the Attention ("Công việc cần chú ý") card:
 * 1. Explicitly blocked tasks (status === "blocked")
 * 2. Unassigned tasks (employeeId === PLANNER_UNASSIGNED_ID) requiring manager assignment
 */
export function buildPlannerBlockers(tasks: readonly SxTask[], now: number): SxBlocker[] {
  const todayIso = vnDay(now);
  const blockers: SxBlocker[] = [];

  for (const t of tasks) {
    if (t.status === "completed") continue;
    const isUnassigned = t.employeeId === PLANNER_UNASSIGNED_ID;
    const daysSinceCreated = t.createdAt ? Math.max(1, dayDiffIso(t.createdAt, todayIso)) : 1;
    const daysUntilDue = t.deadline ? dayDiffIso(todayIso, t.deadline) : Number.POSITIVE_INFINITY;

    if (t.status === "blocked") {
      const days = t.deadline && daysUntilDue < 0 ? Math.max(1, -daysUntilDue) : daysSinceCreated;
      blockers.push({
        id: `blk-${t.id}`,
        taskId: t.id,
        issue: `Bị chặn: ${t.title}`,
        severity: "high",
        daysBlocked: days,
        actionRequired: isUnassigned ? "Assign" : "Escalate",
        taskTitle: t.title,
        employeeId: t.employeeId,
        projectId: t.projectId,
        status: "open",
      });
      continue;
    }

    if (isUnassigned) {
      blockers.push({
        id: `blk-${t.id}`,
        taskId: t.id,
        issue: `Chưa giao phụ trách: ${t.title}`,
        severity: t.priority === "high" ? "high" : "medium",
        daysBlocked: daysSinceCreated,
        actionRequired: "Assign",
        taskTitle: t.title,
        employeeId: t.employeeId,
        projectId: t.projectId,
        status: "open",
      });
    }
  }

  return blockers;
}

export function buildPlannerDataset(src: PlannerSource, now: number): SxDataset {
  const plans = filterPlannerPlans(src.plans);
  const allowedPlanIds = new Set(plans.map((p) => p.id));
  const rawTasks = src.plans.length > 0 ? src.tasks.filter((t) => allowedPlanIds.has(t.planId)) : src.tasks;
  const filteredSrc: PlannerSource = { ...src, plans, tasks: rawTasks };

  const projects: SxProject[] = plans.map((p, i) => ({
    id: p.id,
    name: p.title,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    group: p.groupName,
  }));
  const tasks = rawTasks.map((t) =>
    mapPlannerTask(
      t,
      now,
      src.planCategories?.[t.planId],
      src.taskNotes?.[t.id],
    ),
  );

  return {
    source: "planner",
    employees: buildEmployees(filteredSrc, tasks),
    projects,
    tasks,
    blockers: buildPlannerBlockers(tasks, now),
    projectHealth: plans.map((p) => projectHealthOf(p.id, tasks)),
    notifications: [],
    projectLinks: Object.fromEntries(plans.map((p) => [p.id, plannerPlanUrl(p.id, src.tenantId)])),
    taskEtags: Object.fromEntries(
      rawTasks.filter((t) => t["@odata.etag"]).map((t) => [t.id, t["@odata.etag"] as string]),
    ),
  };
}

function percentForStatus(status: SxStatus, progress: number): number {
  if (status === "completed") return 100;
  if (status === "not_started") return 0;
  if (status === "in_progress") return clampPct(progress, 1, 99);
  // "overdue" / "blocked" have no Planner equivalent — keep the slider value.
  return clampPct(progress);
}

/**
 * Translate a modal edit into a Planner PATCH body containing only the
 * fields that actually changed. Notes are not synced (they live in the
 * separate task-details resource). Returns null when nothing changed.
 */
export function plannerPatchFromEdit(original: SxTask, edit: SxTaskEdit): PlannerTaskPatch | null {
  const patch: { title?: string; percentComplete?: number; priority?: number; dueDateTime?: string | null } = {};

  const cleanTitle = stripBlockedPlannerPrefix(original.title);
  if (edit.status === "blocked" && original.status !== "blocked") {
    patch.title = `${BLOCKED_PLANNER_PREFIX}${cleanTitle}`.slice(0, 255);
  } else if (original.status === "blocked" && edit.status !== "blocked") {
    patch.title = cleanTitle.slice(0, 255);
  }

  const pct =
    edit.status !== original.status ? percentForStatus(edit.status, edit.progress) : clampPct(edit.progress);
  if (pct !== original.progress) patch.percentComplete = pct;

  if (edit.priority !== original.priority) patch.priority = PRIORITY_TO_PLANNER[edit.priority];

  if (edit.deadline !== undefined && edit.deadline !== original.deadline) {
    patch.dueDateTime = edit.deadline ? `${edit.deadline}${DEADLINE_UTC_TIME}` : null;
  }

  return Object.keys(patch).length ? patch : null;
}
