// lib/sx-calendar.ts
// Calendar page model: a Monday-first month grid of Microsoft Planner task
// deadlines (Vietnam days) plus the upcoming list.

import { addDays, weekdayMon0 } from "@/lib/sx-dates";
import type { SxDataset, SxPriority, SxStatus } from "@/lib/sx-dashboard";

const UPCOMING_LIMIT = 8;

export interface SxCalendarTask {
  id: string;
  title: string;
  deadline: string;
  status: SxStatus;
  priority: SxPriority;
  projectName: string;
  employeeName: string;
  overdue: boolean;
}

export interface SxCalendarCell {
  key: string;
  day: number;
  isToday: boolean;
  hasOverdue: boolean;
  tasks: SxCalendarTask[];
}

export interface SxCalendar {
  year: number;
  /** 1–12 */
  month: number;
  cells: (SxCalendarCell | null)[];
  overdueCount: number;
  openCount: number;
  upcoming: SxCalendarTask[];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** @param todayKey today's Vietnam day, YYYY-MM-DD. */
export function buildSxCalendar(ds: SxDataset, todayKey: string): SxCalendar {
  const year = Number(todayKey.slice(0, 4));
  const month = Number(todayKey.slice(5, 7));
  const projectById = new Map(ds.projects.map((p) => [p.id, p.name]));
  const employeeById = new Map(ds.employees.map((e) => [e.id, e.name]));

  const dated: SxCalendarTask[] = ds.tasks
    .filter((t) => t.deadline)
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      status: t.status,
      priority: t.priority,
      projectName: projectById.get(t.projectId) ?? "—",
      employeeName: employeeById.get(t.employeeId) ?? "—",
      overdue: t.status !== "completed" && t.deadline < todayKey,
    }));

  const firstKey = `${todayKey.slice(0, 7)}-01`;
  const leading: null[] = Array.from({ length: weekdayMon0(firstKey) }, () => null);
  const days: SxCalendarCell[] = Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const key = addDays(firstKey, i);
    const tasks = dated.filter((t) => t.deadline === key);
    return { key, day: i + 1, isToday: key === todayKey, hasOverdue: tasks.some((t) => t.overdue), tasks };
  });
  const filled = [...leading, ...days];
  const trailing: null[] = Array.from({ length: (7 - (filled.length % 7)) % 7 }, () => null);

  const open = dated.filter((t) => t.status !== "completed");
  return {
    year,
    month,
    cells: [...filled, ...trailing],
    overdueCount: open.filter((t) => t.overdue).length,
    openCount: open.length,
    upcoming: open
      .filter((t) => t.deadline >= todayKey)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, UPCOMING_LIMIT),
  };
}
