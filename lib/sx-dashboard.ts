// SUNEXT template dashboard — pure data layer.
//
// Adapts the app's Task / Project / User / Notification model to the data
// shape used by the "dark futuristic" HTML template (see
// components/sunext/*), and ports the template's filter / KPI / risk logic
// (assets/js/filters.js + dashboard.js) as pure, testable functions.
//
// No React, no server-only imports: the overview client component calls the
// filter helpers on every filter change, the server page calls
// buildSxDataset once per request.

import type { Notification, Project, Task, User, UserRole } from "@/lib/types";

export type SxStatus = "completed" | "in_progress" | "not_started" | "overdue" | "blocked";
export type SxPriority = "high" | "medium" | "low";
export type SxHealth = "on_track" | "at_risk" | "blocked";
export type SxAction = "Approve" | "Escalate" | "Assign" | "Waiting External" | "No Action";
export type SxPeriod = "all" | "week" | "month" | "quarter" | "year";

export interface SxEmployee {
  id: string;
  name: string;
  initials: string;
  role: string;
  team: string;
  avatar: string;
}

export interface SxProject {
  id: string;
  name: string;
  color: string;
  /** Owning team / Microsoft 365 group (Planner plans only). */
  group?: string;
}

export interface SxTask {
  id: string;
  title: string;
  employeeId: string;
  projectId: string;
  priority: SxPriority;
  status: SxStatus;
  progress: number;
  /** YYYY-MM-DD */
  deadline: string;
  notes: string;
  /** YYYY-MM-DD the task was created (Planner only). */
  createdAt?: string;
  /** YYYY-MM-DD the task was completed (Planner only). */
  completedAt?: string;
}

export interface SxBlocker {
  id: string;
  taskId: string;
  issue: string;
  severity: "high" | "medium";
  daysBlocked: number;
  actionRequired: SxAction;
  taskTitle: string;
  employeeId: string;
  projectId: string;
  status: "open";
}

export interface SxProjectHealth {
  projectId: string;
  progress: number;
  deadline: string;
  tasksDone: number;
  tasksTotal: number;
  health: SxHealth;
}

export interface SxNotification {
  id: string;
  title: string;
  message: string;
  color: string;
  read: boolean;
}

export interface SxDataset {
  employees: SxEmployee[];
  projects: SxProject[];
  tasks: SxTask[];
  blockers: SxBlocker[];
  projectHealth: SxProjectHealth[];
  notifications: SxNotification[];
  /** Where the data comes from; undefined = in-app (mock / Supabase) data. */
  source?: "planner";
  /** Planner: project (plan) id → Microsoft Planner web URL. */
  projectLinks?: Record<string, string>;
  /** Planner: task id → ETag, required by Graph to modify the task. */
  taskEtags?: Record<string, string>;
  /** Notice shown under page titles (e.g. Planner failed to load). */
  sourceNote?: string;
}

/** Fields the task modal can edit. */
export interface SxTaskEdit {
  status: SxStatus;
  priority: SxPriority;
  progress: number;
  notes: string;
  /** YYYY-MM-DD, or "" for no deadline. Absent in older saved edits. */
  deadline?: string;
}

export interface SxFilters {
  period: SxPeriod;
  team: string;
  project: string;
  search: string;
}

export interface SxKpis {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  blocked: number;
  notStarted: number;
}

export const SX_DEFAULT_FILTERS: SxFilters = {
  period: "all",
  team: "all",
  project: "all",
  search: "",
};

const DAY_MS = 86_400_000;

/** Same palette order as the template's MOCK_PROJECTS. */
const PROJECT_COLORS = ["#7b2ff2", "#9e83f5", "#17c98b", "#ff7a00", "#8d68df"];

const NOTIFICATION_COLORS: Record<Notification["type"], string> = {
  deadline: "#ff6170",
  mention: "#8b5cf6",
  assigned: "#24c6ff",
  completed: "#27e0b3",
  blocked: "#ff8a35",
};

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

const toDay = (iso: string) => (iso ? iso.slice(0, 10) : "");

// ── Mapping ───────────────────────────────────────────────────────────

export function mapTaskStatus(task: Task, now: number): SxStatus {
  if (task.status === "done") return "completed";
  if (task.blocked) return "blocked";
  if (new Date(task.dueDate).getTime() < now) return "overdue";
  if (task.status === "in_progress" || task.status === "in_review") return "in_progress";
  return "not_started";
}

function mapPriority(priority: Task["priority"]): SxPriority {
  if (priority === "urgent" || priority === "high") return "high";
  return priority === "medium" ? "medium" : "low";
}

function blockerAction(severity: SxBlocker["severity"], days: number): SxAction {
  if (severity === "high") return days >= 3 ? "Escalate" : "Approve";
  return days >= 3 ? "Assign" : "Waiting External";
}

function deriveHealth(p: Project, now: number): SxHealth {
  if (p.status === "on_hold") return "blocked";
  const start = new Date(p.startDate).getTime();
  const end = new Date(p.dueDate).getTime();
  if (end <= start) return "on_track";
  const expected = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  const variance = p.progress - expected;
  if (variance < -15) return "blocked";
  if (variance < -5) return "at_risk";
  return "on_track";
}

interface SxSource {
  users: readonly User[];
  projects: readonly Project[];
  tasks: readonly Task[];
  notifications: readonly Notification[];
}

export function buildSxDataset(src: SxSource, now: number): SxDataset {
  const employees = src.users.map((u, i) => ({
    id: u.id,
    name: u.name,
    initials: u.initials,
    role: ROLE_LABELS[u.role] ?? u.role,
    team: u.department,
    avatar: `avatar-${(i % 5) + 1}`,
  }));

  const projects = src.projects.map((p, i) => ({
    id: p.id,
    name: p.name,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
  }));

  const tasks: SxTask[] = src.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    employeeId: t.assigneeId,
    projectId: t.projectId,
    priority: mapPriority(t.priority),
    status: mapTaskStatus(t, now),
    progress: t.progress,
    deadline: toDay(t.dueDate),
    notes: t.description ?? "",
  }));

  const blockers: SxBlocker[] = src.tasks
    .filter((t) => t.blocked && t.status !== "done")
    .map((t) => {
      const severity = mapPriority(t.priority) === "high" ? "high" : "medium";
      const daysBlocked = Math.max(0, Math.floor((now - new Date(t.updatedAt).getTime()) / DAY_MS));
      return {
        id: `blk-${t.id}`,
        taskId: t.id,
        issue: t.blockerNote || t.title,
        severity,
        daysBlocked,
        actionRequired: blockerAction(severity, daysBlocked),
        taskTitle: t.title,
        employeeId: t.assigneeId,
        projectId: t.projectId,
        status: "open" as const,
      };
    });

  const projectHealth = src.projects.map((p) => {
    const own = src.tasks.filter((t) => t.projectId === p.id);
    return {
      projectId: p.id,
      progress: p.progress,
      deadline: toDay(p.dueDate),
      tasksDone: own.filter((t) => t.status === "done").length,
      tasksTotal: own.length,
      health: deriveHealth(p, now),
    };
  });

  const notifications = src.notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.body,
    color: NOTIFICATION_COLORS[n.type] ?? "#7b2ff2",
    read: n.read,
  }));

  return { employees, projects, tasks, blockers, projectHealth, notifications };
}

// ── Filters (port of assets/js/filters.js) ────────────────────────────

function periodBounds(period: SxPeriod, now: Date): { start: Date; end: Date } | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "month":
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    case "quarter": {
      const q = Math.floor(m / 3);
      return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 0, 23, 59, 59, 999) };
    }
    case "year":
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
    default:
      return null;
  }
}

export function filterTasks(ds: SxDataset, filters: SxFilters, now: Date): SxTask[] {
  const search = filters.search.trim().toLowerCase();
  const bounds = periodBounds(filters.period, now);
  const empById = new Map(ds.employees.map((e) => [e.id, e]));
  const projById = new Map(ds.projects.map((p) => [p.id, p]));

  return ds.tasks.filter((task) => {
    const emp = empById.get(task.employeeId);
    const proj = projById.get(task.projectId);
    if (search) {
      const haystack = [task.title, task.id, emp?.name ?? "", emp?.team ?? "", proj?.name ?? "", task.status, task.priority]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.team !== "all" && emp?.team !== filters.team) return false;
    if (filters.project !== "all" && proj?.name !== filters.project) return false;
    if (bounds) {
      const deadline = new Date(task.deadline);
      if (deadline < bounds.start || deadline > bounds.end) return false;
    }
    return true;
  });
}

export function filterBlockers(ds: SxDataset, filters: SxFilters): SxBlocker[] {
  const empById = new Map(ds.employees.map((e) => [e.id, e]));
  const projById = new Map(ds.projects.map((p) => [p.id, p]));
  return ds.blockers.filter((b) => {
    if (filters.project !== "all" && projById.get(b.projectId)?.name !== filters.project) return false;
    if (filters.team !== "all" && empById.get(b.employeeId)?.team !== filters.team) return false;
    return true;
  });
}

// ── KPIs / health ─────────────────────────────────────────────────────

export function calcKpis(tasks: readonly SxTask[]): SxKpis {
  const count = (s: SxStatus) => tasks.filter((t) => t.status === s).length;
  return {
    total: tasks.length,
    completed: count("completed"),
    inProgress: count("in_progress"),
    overdue: count("overdue"),
    blocked: count("blocked"),
    notStarted: count("not_started"),
  };
}

export function percentOf(n: number, total: number): string {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%";
}

export function healthSummary(k: SxKpis) {
  const p = (n: number) => (k.total > 0 ? Math.round((n / k.total) * 100) : 0);
  const onTrack = p(k.completed + k.inProgress);
  return { score: onTrack, onTrack, atRisk: p(k.overdue), blocked: p(k.blocked) };
}

// ── Risk / deadline labels (port of assets/js/dashboard.js) ───────────

function daysUntil(deadline: string, now: Date): number {
  return Math.ceil((new Date(deadline).getTime() - now.getTime()) / DAY_MS);
}

export function riskScore(task: SxTask, now: Date): number {
  let score = 0;
  if (task.status === "overdue") score += 100;
  if (task.status === "blocked") score += 80;
  if (task.priority === "high") score += 30;
  if (task.progress < 30) score += 20;
  if (task.deadline) {
    const days = daysUntil(task.deadline, now);
    if (days <= 0) score += 60;
    else if (days <= 1) score += 45;
    else if (days <= 3) score += 20;
  }
  return score;
}

export function riskLabel(task: SxTask, now: Date): { label: string; cls: string } {
  const s = riskScore(task, now);
  if (s >= 120) return { label: "CRITICAL", cls: "risk-critical" };
  if (s >= 70) return { label: "HIGH", cls: "risk-high" };
  if (s >= 30) return { label: "MEDIUM", cls: "risk-medium" };
  return { label: "LOW", cls: "risk-low" };
}

export function formatDeadline(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${toDay(iso)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function daysLabel(task: SxTask, now: Date): { text: string; cls: string } {
  if (!task.deadline) return { text: "—", cls: "" };
  const days = daysUntil(task.deadline, now);
  if (days < 0) return { text: `${Math.abs(days)}d trễ`, cls: "deadline-urgent" };
  if (days === 0) return { text: "Hôm nay", cls: "deadline-urgent" };
  if (days === 1) return { text: "Ngày mai", cls: "deadline-urgent" };
  if (days <= 3) return { text: `+${days} ngày`, cls: "" };
  return { text: formatDeadline(task.deadline), cls: "" };
}

const WEEKDAYS_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** "Thứ Sáu, 02 Tháng 10 2026" — matches ui.js#renderCurrentDate. */
export function vnDateLabel(d: Date): string {
  return `${WEEKDAYS_VI[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")} Tháng ${d.getMonth() + 1} ${d.getFullYear()}`;
}
