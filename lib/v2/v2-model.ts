// lib/v2/v2-model.ts
// Maps the Microsoft Planner dataset (lib/sx-dashboard#SxDataset) onto the
// data shape used by the SUNEXT Dashboard V2 template (TASKS / PROJECTS /
// BLOCKERS in Dashboard Sunext V2/index.html). Pure — no I/O, no clock reads
// except through the `today` argument — so it is fully unit-testable.
//
// Everything here is derived from real Planner records: KPI sparklines and
// "so với tuần trước" deltas are reconstructed from task createdAt /
// completedAt / deadline dates (no sample numbers).

import { taskTeamOf, type SxDataset, type SxPriority, type SxStatus, type SxTask } from "@/lib/sx-dashboard";

export type V2Risk = "critical" | "high" | "medium" | "low";
export type V2Status = "working" | "blocked" | "done" | "todo";
export type V2Health = "onTrack" | "atRisk" | "blocked";
export type V2KpiKey = "total" | "done" | "work" | "late" | "block" | "todo";
export type V2DeltaTone = "good" | "badc" | "";

export interface V2Task {
  /** Short display code (T-001…), stable for a given dataset. */
  readonly id: string;
  /** Planner task id — used for write-back. */
  readonly pid: string;
  readonly title: string;
  readonly owner: string;
  readonly team: string;
  readonly project: string;
  /** YYYY-MM-DD */
  readonly start: string;
  /** YYYY-MM-DD, or "" when the Planner task has no due date. */
  readonly deadline: string;
  readonly risk: V2Risk;
  readonly status: V2Status;
  readonly progress: number;
  readonly notes?: string;
  /** YYYY-MM-DD (Planner) — used for KPI history. */
  readonly createdAt?: string;
  /** Exact ISO 8601 creation timestamp (Planner) — used for real-time wait age. */
  readonly createdDateTime?: string;
  readonly completedAt?: string;
}

export interface V2Project {
  readonly name: string;
  readonly deadline: string;
  readonly progress: number;
  readonly done: number;
  readonly total: number;
  readonly health: V2Health;
  /** Owning Microsoft 365 group, shown under the project name. */
  readonly group: string;
}

export interface V2Blocker {
  readonly id: string;
  readonly issue: string;
  readonly project: string;
  readonly sev: "high" | "medium";
  readonly days: number;
  readonly action: "Escalate" | "Assign" | "";
  readonly owner: string;
  readonly detail: string;
}

export interface V2Notification {
  readonly title: string;
  readonly message: string;
  readonly color: string;
}

export interface V2Model {
  readonly tasks: readonly V2Task[];
  readonly projects: readonly V2Project[];
  readonly blockers: readonly V2Blocker[];
  readonly notifications: readonly V2Notification[];
  readonly teams: readonly string[];
  readonly sourceNote?: string;
}

export interface V2Trend {
  readonly spark: Record<V2KpiKey, number[]>;
  readonly delta: Record<V2KpiKey, readonly [string, V2DeltaTone]>;
}

const DAY_MS = 864e5;
const NO_TEAM = "—";
const RISK_OF: Record<SxPriority, V2Risk> = { high: "high", medium: "medium", low: "low" };
const HEALTH_OF = { on_track: "onTrack", at_risk: "atRisk", blocked: "blocked" } as const;

/** Planner status → template status. "overdue" is recomputed by the template from the deadline. */
export function v2StatusOf(status: SxStatus): V2Status {
  if (status === "completed") return "done";
  if (status === "not_started") return "todo";
  if (status === "blocked") return "blocked";
  return "working";
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

/** Template start date: Planner createdAt, else a week before the deadline, else today. */
function startOf(task: SxTask, today: string): string {
  if (task.createdAt) return task.createdAt;
  if (task.deadline) return task.deadline < today ? shiftDays(task.deadline, -7) : today;
  return today;
}

/** Stable display codes: oldest task first (createdAt, then Planner id). */
function codesFor(tasks: readonly SxTask[]): Map<string, string> {
  const ordered = [...tasks].sort(
    (a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id),
  );
  const width = Math.max(3, String(ordered.length).length);
  return new Map(ordered.map((t, i) => [t.id, `T-${String(i + 1).padStart(width, "0")}`]));
}

export function buildV2Model(ds: SxDataset, today: Date): V2Model {
  const todayIso = isoDay(today);
  const employees = new Map(ds.employees.map((e) => [e.id, e]));
  const projects = new Map(ds.projects.map((p) => [p.id, p]));
  const codes = codesFor(ds.tasks);
  const teamOf = (t: SxTask) => {
    const team = taskTeamOf(projects.get(t.projectId), employees.get(t.employeeId));
    return team && team !== NO_TEAM ? team : "Chưa có team";
  };

  const tasks: V2Task[] = ds.tasks.map((t) => ({
    id: codes.get(t.id) ?? t.id,
    pid: t.id,
    title: t.title,
    owner: employees.get(t.employeeId)?.name ?? "Chưa giao",
    team: teamOf(t),
    project: projects.get(t.projectId)?.name ?? "Không có dự án",
    start: startOf(t, todayIso),
    deadline: t.deadline ?? "",
    risk: RISK_OF[t.priority] ?? "medium",
    status: v2StatusOf(t.status),
    progress: Math.max(0, Math.min(100, Math.round(t.progress))),
    ...(t.notes ? { notes: t.notes } : {}),
    ...(t.createdAt ? { createdAt: t.createdAt } : {}),
    ...(t.createdDateTime ? { createdDateTime: t.createdDateTime } : {}),
    ...(t.completedAt ? { completedAt: t.completedAt } : {}),
  }));

  const healthById = new Map(ds.projectHealth.map((h) => [h.projectId, h]));
  const v2Projects: V2Project[] = ds.projects
    .map((p) => {
      const h = healthById.get(p.id);
      return {
        name: p.name,
        deadline: h?.deadline ?? "",
        progress: h?.progress ?? 0,
        done: h?.tasksDone ?? 0,
        total: h?.tasksTotal ?? 0,
        health: h ? HEALTH_OF[h.health] : ("onTrack" as const),
        group: p.group ?? "",
      };
    })
    .filter((p) => p.total > 0);

  const blockers: V2Blocker[] = ds.blockers.map((b) => ({
    id: b.id,
    issue: b.issue,
    project: projects.get(b.projectId)?.name ?? "",
    sev: b.severity,
    days: b.daysBlocked,
    action: b.actionRequired === "Escalate" || b.actionRequired === "Assign" ? b.actionRequired : "",
    owner: employees.get(b.employeeId)?.name ?? "Chưa giao",
    detail: b.taskTitle ? `Ảnh hưởng công việc: ${b.taskTitle}` : "",
  }));

  const teams = [...new Set(tasks.map((t) => t.team))].sort((a, b) => a.localeCompare(b, "vi"));

  return {
    tasks,
    projects: v2Projects,
    blockers,
    notifications: ds.notifications
      .filter((n) => !n.read)
      .map((n) => ({ title: n.title, message: n.message, color: n.color })),
    teams,
    ...(ds.sourceNote ? { sourceNote: ds.sourceNote } : {}),
  };
}

function dayDiffIso(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

/**
 * Dynamically derives V2Blocker rows from the currently filtered V2Task list,
 * keeping only explicitly blocked tasks and unassigned tasks (overdue and
 * due-soon tasks belong solely in the Attention card).
 */
export function deriveV2Blockers(tasks: readonly V2Task[], today: Date): V2Blocker[] {
  const todayIso = isoDay(today);
  const blockers: V2Blocker[] = [];

  for (const t of tasks) {
    if (t.status === "done") continue;
    const isUnassigned = t.owner === "Chưa giao";
    const daysSinceStart = Math.max(1, dayDiffIso(t.createdAt ?? t.start, todayIso));
    const daysUntilDue = t.deadline ? dayDiffIso(todayIso, t.deadline) : Number.POSITIVE_INFINITY;
    const isHighRisk = t.risk === "high" || t.risk === "critical";

    if (t.status === "blocked") {
      const days = t.deadline && daysUntilDue < 0 ? Math.max(1, -daysUntilDue) : daysSinceStart;
      blockers.push({
        id: `blk-${t.pid}`,
        issue: `Bị chặn: ${t.title}`,
        project: t.project,
        sev: "high",
        days,
        action: isUnassigned ? "Assign" : "Escalate",
        owner: t.owner,
        detail: `Ảnh hưởng công việc: ${t.title} (${t.id})`,
      });
      continue;
    }

    if (isUnassigned) {
      blockers.push({
        id: `blk-${t.pid}`,
        issue: `Chưa giao phụ trách: ${t.title}`,
        project: t.project,
        sev: isHighRisk ? "high" : "medium",
        days: daysSinceStart,
        action: "Assign",
        owner: t.owner,
        detail: `Ảnh hưởng công việc: ${t.title} (${t.id})`,
      });
    }
  }

  return blockers;
}

/* ------------------------------------------------------------------ */
/* KPI history (sparklines + week-over-week deltas)                    */
/* ------------------------------------------------------------------ */

type Snapshot = Record<V2KpiKey, number>;

/** KPI counts as they stood at the end of `day` (YYYY-MM-DD); every task lands in exactly one state. */
export function snapshotAt(tasks: readonly V2Task[], day: string, todayIso: string): Snapshot {
  const s: Snapshot = { total: 0, done: 0, work: 0, late: 0, block: 0, todo: 0 };
  for (const t of tasks) {
    if (t.createdAt && t.createdAt > day) continue;
    s.total++;
    const done = t.completedAt ? t.completedAt <= day : t.status === "done" && day >= todayIso;
    if (done) s.done++;
    else if (t.status === "blocked" && day >= todayIso) s.block++;
    else if (t.deadline && t.deadline < day) s.late++;
    else if (t.status === "todo") s.todo++;
    else s.work++;
  }
  return s;
}

const UP_IS_GOOD: Record<V2KpiKey, boolean> = { total: true, done: true, work: true, late: false, block: false, todo: false };

/** "↑ 12%" / "↓ 5%" with the template's tone class; "–" when there is no baseline. */
export function deltaOf(key: V2KpiKey, prev: number, cur: number): readonly [string, V2DeltaTone] {
  if (prev === cur) return ["0%", ""];
  const up = cur > prev;
  const tone: V2DeltaTone = up === UP_IS_GOOD[key] ? "good" : "badc";
  if (prev === 0) return [`↑ ${cur}`, tone];
  const pct = Math.round((Math.abs(cur - prev) / prev) * 100);
  return [`${up ? "↑" : "↓"} ${pct}%`, tone];
}

/** Seven weekly points ending today + delta vs. one week ago, for the given (filtered) tasks. */
export function computeTrend(tasks: readonly V2Task[], today: Date, points = 7): V2Trend {
  const todayIso = isoDay(today);
  const snaps = Array.from({ length: points }, (_, i) =>
    snapshotAt(tasks, shiftDays(todayIso, -7 * (points - 1 - i)), todayIso),
  );
  const keys: V2KpiKey[] = ["total", "done", "work", "late", "block", "todo"];
  const spark = Object.fromEntries(keys.map((k) => [k, snaps.map((s) => s[k])])) as Record<V2KpiKey, number[]>;
  const prev = snaps[points - 2] ?? snaps[points - 1];
  const cur = snaps[points - 1];
  const delta = Object.fromEntries(keys.map((k) => [k, deltaOf(k, prev[k], cur[k])])) as V2Trend["delta"];
  return { spark, delta };
}

export const V2_DAY_MS = DAY_MS;
export { isoDay as v2IsoDay };
