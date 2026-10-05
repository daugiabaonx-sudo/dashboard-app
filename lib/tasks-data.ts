// Tasks data layer for the v2 Animated Tasks table.
//
// Server-only module. Joins `tasks` from `lib/data.ts` with the assignee
// and project rows so the client can render a fully-resolved row shape
// without re-doing the work in the browser. The pure helpers
// (`sortDashboardTasks`, `filterDashboardTasks`) live in `tasks-types.ts`
// so the client component can import them without pulling the data layer.

import "server-only";
import { tasks, users, projects } from "@/lib/data";
import type { Task } from "@/lib/types";
import {
  filterDashboardTasks as filterRows,
  sortDashboardTasks as sortRows,
  toRow as toRowImpl,
  type DashboardTaskFilters,
  type DashboardTaskRow,
} from "@/lib/tasks-types";

export type { DashboardTaskRow } from "@/lib/tasks-types";
export {
  PRIORITY_ORDER,
  STATUS_ORDER,
  filterDashboardTasks,
  sortDashboardTasks,
  type DashboardTaskSortDir,
  type DashboardTaskSortKey,
} from "@/lib/tasks-types";

export function getDashboardTasks(
  filters: DashboardTaskFilters = {},
): DashboardTaskRow[] {
  const out: DashboardTaskRow[] = [];
  for (const task of tasks) {
    const row = toRowImpl(task, filters, users, projects);
    if (row) out.push(row);
  }
  return out;
}

// Server-side helpers re-used by the unit tests.
export const toRow = (task: Task, filters: DashboardTaskFilters = {}) =>
  toRowImpl(task, filters, users, projects);
export const filterRowsForTest = filterRows;
export const sortRowsForTest = sortRows;
