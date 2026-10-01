// Dashboard v2 data shape — single source of truth for the redesigned home page.
//
// Builds the full summary (profile + KPIs + featured + blockers + donut) in one
// call so v2 server components don't have to chain multiple queries. Mock-only
// for now; the `MOCK_SUPABASE` adapter site lives at the bottom of the file
// and is gated behind the env flag. A real Supabase swap goes in one place.

import { findUser, projects, tasks } from "@/lib/data";
import type { TaskStatus } from "@/lib/types";

export type DashboardRole = "admin" | "member";

export interface DashboardScope {
  userId: string;
  role: DashboardRole;
}

export interface DashboardProfile {
  userId: string;
  name: string;
  initials: string;
  role: DashboardRole;
  avatarColor: string;
}

export type DashboardKpiId =
  | "total"
  | "completed"
  | "inProgress"
  | "overdue"
  | "blocked";

export type DashboardKpiIntent = "neutral" | "good" | "warning" | "critical";
export type DashboardTrend = "up" | "down" | "flat";

export interface DashboardKpi {
  id: DashboardKpiId;
  label: string;
  value: number;
  delta: number;
  deltaLabel: string;
  trend: DashboardTrend;
  intent: DashboardKpiIntent;
  sparkline: number[];
}

export type DashboardPriority = "high" | "medium" | "low";
export type DashboardSeverity = "high" | "medium" | "low";

export interface DashboardFeaturedRow {
  id: string;
  title: string;
  projectName: string;
  ownerInitials: string;
  ownerColor: string;
  priority: DashboardPriority;
  dueDate: string;
  progress: number;
}

export interface DashboardBlockerRow {
  id: string;
  title: string;
  taskProject: string;
  assigneeInitials: string;
  assigneeColor: string;
  daysStuck: number;
  severity: DashboardSeverity;
}

export interface DashboardDonutSlice {
  label: string;
  value: number;
  color: string;
}

export interface DashboardDonut {
  slices: DashboardDonutSlice[];
  total: number;
}

export interface DashboardSummary {
  profile: DashboardProfile;
  kpis: DashboardKpi[];
  featured: DashboardFeaturedRow[];
  blockers: DashboardBlockerRow[];
  statusDonut: DashboardDonut;
}

const SPARKLINE: Record<DashboardKpiId, number[]> = {
  total: [42, 48, 51, 47, 55, 58, 60, 63, 61, 66, 68, 72],
  completed: [4, 6, 5, 9, 12, 14, 18, 21, 23, 26, 28, 31],
  inProgress: [10, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16],
  overdue: [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7],
  blocked: [22, 19, 15, 14, 12, 10, 8, 7, 6, 5, 4, 3],
};

const DAY_MS = 86_400_000;

function deriveKpiCounts(now: number) {
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter(
    (t) => t.status !== "done" && new Date(t.dueDate).getTime() < now,
  ).length;
  const blocked = tasks.filter((t) => t.blocked).length;
  return { total: tasks.length, completed, inProgress, overdue, blocked };
}

function buildKpis(counts: ReturnType<typeof deriveKpiCounts>): DashboardKpi[] {
  const overdueTrend: DashboardTrend = counts.overdue > 0 ? "up" : "flat";
  return [
    {
      id: "total",
      label: "Total tasks",
      value: counts.total,
      delta: 12,
      deltaLabel: "vs last week",
      trend: "up",
      intent: "neutral",
      sparkline: SPARKLINE.total,
    },
    {
      id: "completed",
      label: "Completed",
      value: counts.completed,
      delta: 8,
      deltaLabel: "this week",
      trend: "up",
      intent: "good",
      sparkline: SPARKLINE.completed,
    },
    {
      id: "inProgress",
      label: "In progress",
      value: counts.inProgress,
      delta: 5,
      deltaLabel: "of total",
      trend: "down",
      intent: "neutral",
      sparkline: SPARKLINE.inProgress,
    },
    {
      id: "overdue",
      label: "Overdue",
      value: counts.overdue,
      delta: counts.overdue > 0 ? 1 : 0,
      deltaLabel: "of total",
      trend: overdueTrend,
      intent: counts.overdue > 0 ? "critical" : "good",
      sparkline: SPARKLINE.overdue,
    },
    {
      id: "blocked",
      label: "Blocked",
      value: counts.blocked,
      delta: 20,
      deltaLabel: "of total",
      trend: "down",
      intent: counts.blocked > 0 ? "warning" : "good",
      sparkline: SPARKLINE.blocked,
    },
  ];
}

function priorityBucket(
  priority: "low" | "medium" | "high" | "urgent",
): DashboardPriority {
  if (priority === "urgent" || priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function buildFeatured(limit: number): DashboardFeaturedRow[] {
  const now = Date.now();
  const scored = tasks
    .filter((t) => t.status !== "done")
    .map((task) => {
      const due = new Date(task.dueDate).getTime();
      const daysUntilDue = (due - now) / DAY_MS;
      let score = 0;
      if (task.priority === "urgent") score += 100;
      else if (task.priority === "high") score += 60;
      else if (task.priority === "medium") score += 30;
      if (daysUntilDue < 0) score += 80;
      else if (daysUntilDue <= 3) score += 40;
      else if (daysUntilDue <= 7) score += 20;
      if (task.blocked) score += 50;
      return { task, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ task }) => {
    const project = projects.find((p) => p.id === task.projectId);
    const assignee = findUser(task.assigneeId);
    return {
      id: task.id,
      title: task.title,
      projectName: project?.name ?? "—",
      ownerInitials: assignee?.initials ?? "??",
      ownerColor: assignee?.avatarColor ?? "#94a3b8",
      priority: priorityBucket(task.priority),
      dueDate: task.dueDate,
      progress: task.progress,
    };
  });
}

function severityBucket(
  priority: "low" | "medium" | "high" | "urgent",
): DashboardPriority {
  if (priority === "urgent" || priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function buildBlockers(limit: number): DashboardBlockerRow[] {
  const now = Date.now();
  const blocked = tasks
    .filter((t) => t.blocked)
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  // Top up from the next highest-priority overdue-but-not-blocked tasks so
  // the card always shows a stable number of rows even when the seed has
  // few blocked items. Surfaces a meaningful "needs help" pipeline either way.
  const filler = blocked.length >= limit
    ? []
    : tasks
        .filter((t) => !t.blocked && t.status !== "done")
        .filter((t) => new Date(t.dueDate).getTime() < now)
        .sort((x, y) => {
          const rank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
          return rank[x.priority] - rank[y.priority];
        })
        .slice(0, limit - blocked.length);
  return [...blocked, ...filler].slice(0, limit).map((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      const assignee = findUser(task.assigneeId);
      const daysStuck = Math.max(
        0,
        Math.round((now - new Date(task.dueDate).getTime()) / DAY_MS),
      );
      return {
        id: task.id,
        title: task.title,
        taskProject: `${task.title.split(" ").slice(0, 3).join(" ")} · ${project?.name ?? "—"}`,
        assigneeInitials: assignee?.initials ?? "??",
        assigneeColor: assignee?.avatarColor ?? "#94a3b8",
        daysStuck,
        severity: severityBucket(task.priority),
      };
    });
}

const DONUT_COLOR_TOKENS: Record<TaskStatus, string> = {
  done: "var(--status-good)",
  in_review: "var(--status-warning)",
  in_progress: "var(--primary)",
  todo: "var(--status-neutral)",
  backlog: "var(--status-neutral-strong)",
};

const DONUT_LABEL: Record<TaskStatus, string> = {
  done: "Done",
  in_review: "In review",
  in_progress: "In progress",
  todo: "To do",
  backlog: "Backlog",
};

function buildDonut(): DashboardDonut {
  const order: TaskStatus[] = [
    "done",
    "in_review",
    "in_progress",
    "todo",
    "backlog",
  ];
  const slices = order.map((status) => ({
    label: DONUT_LABEL[status],
    value: tasks.filter((t) => t.status === status).length,
    color: DONUT_COLOR_TOKENS[status],
  }));
  return {
    slices,
    total: slices.reduce((acc, s) => acc + s.value, 0),
  };
}

function buildProfile(scope: DashboardScope): DashboardProfile {
  const user = findUser(scope.userId);
  return {
    userId: scope.userId,
    name: user?.name ?? "Minh Anh",
    initials: user?.initials ?? "MA",
    role: scope.role,
    avatarColor: user?.avatarColor ?? "#6366f1",
  };
}

export function getDashboardSummary(scope: DashboardScope): DashboardSummary {
  const now = Date.now();
  const counts = deriveKpiCounts(now);
  return {
    profile: buildProfile(scope),
    kpis: buildKpis(counts),
    featured: buildFeatured(5),
    blockers: buildBlockers(4),
    statusDonut: buildDonut(),
  };
}

// TODO: swap to lib/db/stats.ts#getKpis(workspaceId) once the real adapter
// is available. The shape returned here is what the v2 components already
// accept; a typed `adaptRealToSummary` bridge keeps the swap to a single edit.
function adaptRealToSummary(_scope: DashboardScope): DashboardSummary {
  throw new Error("Real Supabase adapter not yet implemented");
}