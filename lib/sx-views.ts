// SUNEXT template page views — pure helpers.
//
// Ports the aggregations in the template's assets/js/sidebar.js
// (buildProjectsView / buildEmployeesView) and decides which shell layout a
// route uses. No React, safe to import from server or client code.

import type { SxDataset, SxTask } from "@/lib/sx-dashboard";

export type SxVariant = "overview" | "page";

/** Routes that render a template view inside the one-screen `.content`. */
const TEMPLATE_ROUTES = new Set(["/", "/tasks", "/projects", "/team", "/notifications", "/settings"]);

/**
 * "overview" → template styles (`.sx-ov`) + `.content` container.
 * "page"     → legacy Tailwind page in the scrollable `.sx-page` wrapper
 *              (reports, calendar, detail pages).
 */
export function sxVariantFor(pathname: string): SxVariant {
  if (!pathname) return "page";
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return TEMPLATE_ROUTES.has(normalized || "/") ? "overview" : "page";
}

export interface SxProjectCardData {
  id: string;
  name: string;
  color: string;
  total: number;
  done: number;
  pct: number;
  blocked: number;
  overdue: number;
}

export function projectCards(ds: SxDataset, tasks: readonly SxTask[] = ds.tasks): SxProjectCardData[] {
  return ds.projects.map((p) => {
    const own = tasks.filter((t) => t.projectId === p.id);
    const done = own.filter((t) => t.status === "completed").length;
    const total = own.length;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      blocked: own.filter((t) => t.status === "blocked").length,
      overdue: own.filter((t) => t.status === "overdue").length,
    };
  });
}

export interface SxEmployeeCardData {
  id: string;
  name: string;
  initials: string;
  role: string;
  team: string;
  avatar: string;
  tasks: number;
  done: number;
  active: number;
  overdue: number;
  avgProg: number;
}

export function employeeCards(ds: SxDataset, tasks: readonly SxTask[] = ds.tasks): SxEmployeeCardData[] {
  return ds.employees.map((e) => {
    const own = tasks.filter((t) => t.employeeId === e.id);
    const avgProg = own.length > 0 ? Math.round(own.reduce((s, t) => s + t.progress, 0) / own.length) : 0;
    return {
      ...e,
      tasks: own.length,
      done: own.filter((t) => t.status === "completed").length,
      active: own.filter((t) => t.status === "in_progress").length,
      overdue: own.filter((t) => t.status === "overdue").length,
      avgProg,
    };
  });
}
