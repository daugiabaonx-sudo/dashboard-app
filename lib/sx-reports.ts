// lib/sx-reports.ts
// Reports page model, computed from the Microsoft Planner dataset only
// (no budgets or hardcoded velocity — Planner has neither).

import { addDays, dayMonthLabel, mondayOf } from "@/lib/sx-dates";
import type { SxDataset, SxHealth, SxTask } from "@/lib/sx-dashboard";

const VELOCITY_WEEKS = 8;
const OVERDUE_LIMIT = 5;

export interface SxVelocityPoint {
  week: string;
  completed: number;
  created: number;
}

export interface SxReportProject {
  id: string;
  name: string;
  color: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  health: SxHealth;
}

export interface SxReportOverdueTask {
  id: string;
  title: string;
  deadline: string;
  projectName: string;
  employeeName: string;
}

export interface SxReport {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  completionRate: number;
  completedThisWeek: number;
  velocity: SxVelocityPoint[];
  projects: SxReportProject[];
  overdueTasks: SxReportOverdueTask[];
}

const inRange = (day: string | undefined, start: string, end: string) => Boolean(day && day >= start && day <= end);

function buildVelocity(tasks: readonly SxTask[], todayKey: string): SxVelocityPoint[] {
  const thisMonday = mondayOf(todayKey);
  return Array.from({ length: VELOCITY_WEEKS }, (_, i) => {
    const start = addDays(thisMonday, -7 * (VELOCITY_WEEKS - 1 - i));
    const end = addDays(start, 6);
    return {
      week: i === VELOCITY_WEEKS - 1 ? "Tuần này" : dayMonthLabel(start),
      completed: tasks.filter((t) => inRange(t.completedAt, start, end)).length,
      created: tasks.filter((t) => inRange(t.createdAt, start, end)).length,
    };
  });
}

/** @param todayKey today's Vietnam day, YYYY-MM-DD. */
export function buildSxReport(ds: SxDataset, todayKey: string): SxReport {
  const projectById = new Map(ds.projects.map((p) => [p.id, p]));
  const employeeById = new Map(ds.employees.map((e) => [e.id, e]));
  const total = ds.tasks.length;
  const completed = ds.tasks.filter((t) => t.status === "completed").length;
  const thisMonday = mondayOf(todayKey);

  const overdueTasks = ds.tasks
    .filter((t) => t.status === "overdue")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, OVERDUE_LIMIT)
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      projectName: projectById.get(t.projectId)?.name ?? "—",
      employeeName: employeeById.get(t.employeeId)?.name ?? "—",
    }));

  const projects = ds.projectHealth.map((h) => {
    const p = projectById.get(h.projectId);
    return {
      id: h.projectId,
      name: p?.name ?? h.projectId,
      color: p?.color ?? "#7b2ff2",
      progress: h.progress,
      tasksDone: h.tasksDone,
      tasksTotal: h.tasksTotal,
      health: h.health,
    };
  });

  return {
    total,
    completed,
    open: total - completed,
    overdue: ds.tasks.filter((t) => t.status === "overdue").length,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    completedThisWeek: ds.tasks.filter((t) => inRange(t.completedAt, thisMonday, addDays(thisMonday, 6))).length,
    velocity: buildVelocity(ds.tasks, todayKey),
    projects,
    overdueTasks,
  };
}
