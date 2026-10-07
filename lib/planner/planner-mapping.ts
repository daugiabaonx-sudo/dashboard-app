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

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const DEADLINE_UTC_TIME = "T05:00:00Z";
const PROJECT_COLORS = ["#7b2ff2", "#9e83f5", "#17c98b", "#ff7a00", "#8d68df", "#24c6ff", "#ff6170"];
const PRIORITY_TO_PLANNER: Record<SxPriority, number> = { high: 3, medium: 5, low: 9 };
const OVERDUE_BLOCKED_RATIO = 0.3;

export interface PlannerSource {
  readonly tenantId: string;
  readonly plans: readonly PlannerPlanWithGroup[];
  readonly tasks: readonly PlannerTask[];
  /** groupId → members of that Microsoft 365 group. */
  readonly members: Readonly<Record<string, readonly PlannerMember[]>>;
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

const clampPct = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n)));

export function mapPlannerPriority(priority: number): SxPriority {
  if (priority <= 4) return "high";
  return priority <= 7 ? "medium" : "low";
}

export function mapPlannerStatus(task: PlannerTask, now: number): SxStatus {
  if (task.percentComplete >= 100) return "completed";
  if (task.dueDateTime && vnDay(task.dueDateTime) < vnDay(now)) return "overdue";
  return task.percentComplete > 0 ? "in_progress" : "not_started";
}

export function mapPlannerTask(task: PlannerTask, now: number): SxTask {
  const assignee = Object.keys(task.assignments ?? {})[0];
  return {
    id: task.id,
    title: task.title,
    employeeId: assignee ?? PLANNER_UNASSIGNED_ID,
    projectId: task.planId,
    priority: mapPlannerPriority(task.priority),
    status: mapPlannerStatus(task, now),
    progress: clampPct(task.percentComplete),
    deadline: task.dueDateTime ? vnDay(task.dueDateTime) : "",
    notes: "",
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
  for (const list of Object.values(src.members)) {
    for (const m of list) if (!memberById.has(m.id)) memberById.set(m.id, m);
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
      team: m?.department?.trim() || teamOf.get(id) || "Planner",
      avatar,
    };
  });
}

function projectHealthOf(planId: string, tasks: readonly SxTask[]): SxProjectHealth {
  const own = tasks.filter((t) => t.projectId === planId);
  const overdue = own.filter((t) => t.status === "overdue").length;
  const deadlines = own.map((t) => t.deadline).filter(Boolean).sort();
  let health: SxHealth = "on_track";
  if (overdue > 0) health = overdue / own.length >= OVERDUE_BLOCKED_RATIO ? "blocked" : "at_risk";
  return {
    projectId: planId,
    progress: own.length ? Math.round(own.reduce((s, t) => s + t.progress, 0) / own.length) : 0,
    deadline: deadlines.at(-1) ?? "",
    tasksDone: own.filter((t) => t.status === "completed").length,
    tasksTotal: own.length,
    health,
  };
}

export function buildPlannerDataset(src: PlannerSource, now: number): SxDataset {
  const projects: SxProject[] = src.plans.map((p, i) => ({
    id: p.id,
    name: p.title,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    group: p.groupName,
  }));
  const tasks = src.tasks.map((t) => mapPlannerTask(t, now));

  return {
    source: "planner",
    employees: buildEmployees(src, tasks),
    projects,
    tasks,
    blockers: [],
    projectHealth: src.plans.map((p) => projectHealthOf(p.id, tasks)),
    notifications: [],
    projectLinks: Object.fromEntries(src.plans.map((p) => [p.id, plannerPlanUrl(p.id, src.tenantId)])),
    taskEtags: Object.fromEntries(
      src.tasks.filter((t) => t["@odata.etag"]).map((t) => [t.id, t["@odata.etag"] as string]),
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
  const patch: { percentComplete?: number; priority?: number; dueDateTime?: string | null } = {};

  const pct =
    edit.status !== original.status ? percentForStatus(edit.status, edit.progress) : clampPct(edit.progress);
  if (pct !== original.progress) patch.percentComplete = pct;

  if (edit.priority !== original.priority) patch.priority = PRIORITY_TO_PLANNER[edit.priority];

  if (edit.deadline !== undefined && edit.deadline !== original.deadline) {
    patch.dueDateTime = edit.deadline ? `${edit.deadline}${DEADLINE_UTC_TIME}` : null;
  }

  return Object.keys(patch).length ? patch : null;
}
