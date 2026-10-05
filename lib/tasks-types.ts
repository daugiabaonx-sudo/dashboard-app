// Pure types + helpers for the v2 Animated Tasks table.
//
// This module is safe to import from BOTH the server (`lib/tasks-data.ts`)
// and the client (`components/dashboard-v2/tasks/animated-table.tsx`).
// It contains no I/O and no data access — just type definitions and the
// pure sort/filter functions that the client needs at runtime.

import type { Project, Task, TaskPriority, TaskStatus, User } from "@/lib/types";

export interface DashboardTaskRow {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  assigneeInitials: string;
  assigneeColor: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  progress: number;
  blocked: boolean;
  blockerNote?: string;
  tags: string[];
}

export type DashboardTaskSortKey =
  | "id"
  | "title"
  | "status"
  | "priority"
  | "assignee"
  | "project"
  | "dueDate"
  | "progress";
export type DashboardTaskSortDir = "asc" | "desc";

export interface DashboardTaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  q?: string;
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const STATUS_ORDER: Record<TaskStatus, number> = {
  backlog: 0,
  todo: 1,
  in_progress: 2,
  in_review: 3,
  done: 4,
};

export function toRow(
  task: Task,
  filters: DashboardTaskFilters = {},
  users: User[] = [],
  projects: Project[] = [],
): DashboardTaskRow | null {
  if (filters.status && task.status !== filters.status) return null;
  if (filters.priority && task.priority !== filters.priority) return null;
  if (filters.q && !matchesQuery(task, filters.q, users, projects)) return null;

  const assignee = users.find((u) => u.id === task.assigneeId);
  const project = projects.find((p) => p.id === task.projectId);
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    assigneeName: assignee?.name ?? "Unassigned",
    assigneeInitials: assignee?.initials ?? "??",
    assigneeColor: assignee?.avatarColor ?? "#94a3b8",
    projectId: task.projectId,
    projectName: project?.name ?? "—",
    dueDate: task.dueDate,
    progress: task.progress,
    blocked: task.blocked ?? false,
    blockerNote: task.blockerNote,
    tags: task.tags,
  };
}

function matchesQuery(
  task: Task,
  q: string,
  users: User[] = [],
  projects: Project[] = [],
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const assignee = users.find((u) => u.id === task.assigneeId);
  const project = projects.find((p) => p.id === task.projectId);
  const haystack = [
    task.title,
    task.description,
    assignee?.name ?? "",
    project?.name ?? "",
    ...task.tags,
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterDashboardTasks(
  rows: DashboardTaskRow[],
  q: string,
): DashboardTaskRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.title,
      row.description,
      row.assigneeName,
      row.projectName,
      ...row.tags,
    ]
      .join("\n")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function compareByKey(
  a: DashboardTaskRow,
  b: DashboardTaskRow,
  key: DashboardTaskSortKey,
): number {
  switch (key) {
    case "title":
      return a.title.localeCompare(b.title);
    case "status":
      // Ascending → workflow order (backlog first).
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "priority":
      // Ascending → most-urgent first (urgent > high > medium > low).
      return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    case "assignee":
      return a.assigneeName.localeCompare(b.assigneeName);
    case "project":
      return a.projectName.localeCompare(b.projectName);
    case "dueDate":
      return a.dueDate.localeCompare(b.dueDate);
    case "progress":
      return a.progress - b.progress;
    case "id":
    default:
      return a.id.localeCompare(b.id);
  }
}

export function sortDashboardTasks(
  rows: DashboardTaskRow[],
  key: DashboardTaskSortKey,
  dir: DashboardTaskSortDir,
): DashboardTaskRow[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = compareByKey(a, b, key);
    if (primary !== 0) return primary * factor;
    return a.id.localeCompare(b.id) * factor;
  });
}
