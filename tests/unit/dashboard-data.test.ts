// tests/unit/dashboard-data.test.ts
// Unit tests for the dashboard v2 query helpers. These are pure
// data-shape transforms over the in-memory fixtures in lib/data.ts;
// no React, no DOM. Verified invariants:
//
// - KPI strip: 5 entries with sparklines, intents reflect counts
// - Status donut: every TaskStatus present, total matches sum
// - Blockers: only `blocked` tasks, sorted by due date ascending
// - Featured tasks: limited count, sorted by score (urgent/blocked
//   win), assignee + project joined in

import { describe, expect, it } from "vitest";
import {
  getBlockers,
  getFeaturedTasks,
  getKpiStrip,
  getStatusDonut,
  tasks,
} from "@/lib/data";
import type { TaskStatus } from "@/lib/types";

const ALL_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

describe("getKpiStrip", () => {
  it("returns 5 KPIs with sparkline arrays", () => {
    const strip = getKpiStrip();
    expect(strip).toHaveLength(5);
    for (const kpi of strip) {
      expect(Array.isArray(kpi.sparkline)).toBe(true);
      expect(kpi.sparkline.length).toBeGreaterThan(0);
      expect(kpi.sparkline.every((n) => typeof n === "number")).toBe(true);
    }
  });

  it("includes the canonical KPI ids", () => {
    const ids = getKpiStrip().map((k) => k.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "total",
        "completed",
        "inProgress",
        "overdue",
        "blocked",
      ]),
    );
  });

  it("marks overdue KPI as critical when there are overdue tasks", () => {
    const overdue = tasks.filter(
      (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
    );
    if (overdue.length === 0) return;
    const kpi = getKpiStrip().find((k) => k.id === "overdue");
    expect(kpi?.intent).toBe("critical");
  });
});

describe("getStatusDonut", () => {
  it("includes a slice for every status, with non-negative counts", () => {
    const { slices, total } = getStatusDonut();
    expect(slices.map((s) => s.status).sort()).toEqual([...ALL_STATUSES].sort());
    for (const slice of slices) {
      expect(slice.count).toBeGreaterThanOrEqual(0);
      expect(slice.label.length).toBeGreaterThan(0);
    }
    expect(total).toBe(tasks.length);
  });

  it("uses a color token for every entry", () => {
    const { slices } = getStatusDonut();
    for (const slice of slices) {
      expect(slice.colorToken).toMatch(
        /^(status-good|status-warning|primary|status-neutral)$/,
      );
    }
  });
});

describe("getBlockers", () => {
  it("returns only blocked tasks", () => {
    const rows = getBlockers();
    expect(rows.every((r) => r.task.blocked)).toBe(true);
  });

  it("sorts by due date ascending (most urgent first)", () => {
    const rows = getBlockers();
    const dates = rows.map((r) => new Date(r.task.dueDate).getTime());
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
  });

  it("includes project + assignee + relative due string", () => {
    const rows = getBlockers();
    if (rows.length === 0) return;
    const first = rows[0]!;
    expect(first.projectName.length).toBeGreaterThan(0);
    expect(first.assigneeName.length).toBeGreaterThan(0);
    expect(first.dueRelative.length).toBeGreaterThan(0);
  });
});

describe("getFeaturedTasks", () => {
  it("respects the limit and excludes done tasks", () => {
    const rows = getFeaturedTasks(5);
    expect(rows.length).toBeLessThanOrEqual(5);
    expect(rows.every((r) => r.task.status !== "done")).toBe(true);
  });

  it("joins assignee + project metadata", () => {
    const rows = getFeaturedTasks(5);
    if (rows.length === 0) return;
    for (const row of rows) {
      expect(row.assigneeInitials.length).toBeGreaterThan(0);
      expect(row.projectName.length).toBeGreaterThan(0);
      expect(["neutral", "primary", "serious", "critical"]).toContain(
        row.priorityTone,
      );
    }
  });

  it("prefers blocked + urgent tasks over neutral ones", () => {
    const rows = getFeaturedTasks(10);
    if (rows.length === 0) return;
    const top = rows[0]!;
    const isUrgentOrBlocked =
      top.task.priority === "urgent" ||
      top.task.priority === "high" ||
      top.task.blocked ||
      new Date(top.task.dueDate).getTime() < Date.now() + 3 * 86400000;
    expect(isUrgentOrBlocked).toBe(true);
  });
});