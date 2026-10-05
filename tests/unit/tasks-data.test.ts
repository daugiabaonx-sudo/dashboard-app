// tests/unit/tasks-data.test.ts
// Unit tests for the v2 Animated Tasks table data layer.
// Covers the pure helpers (sort, filter, priority/status ordering) and the
// row builder (joins user + project). The AnimatedTable client component
// itself is exercised via e2e tests since jsdom is not configured.

import { describe, expect, it } from "vitest";
import {
  filterDashboardTasks,
  PRIORITY_ORDER,
  sortDashboardTasks,
  STATUS_ORDER,
  type DashboardTaskRow,
} from "@/lib/tasks-types";
import { getDashboardTasks, toRow } from "@/lib/tasks-data";
import { tasks } from "@/lib/data";

function baseRow(overrides: Partial<DashboardTaskRow> = {}): DashboardTaskRow {
  return {
    id: "x",
    title: "Default",
    description: "",
    status: "todo",
    priority: "medium",
    assigneeId: "u1",
    assigneeName: "Alice",
    assigneeInitials: "AL",
    assigneeColor: "#000",
    projectId: "p1",
    projectName: "Project",
    dueDate: "2026-01-01",
    progress: 0,
    blocked: false,
    tags: [],
    ...overrides,
  };
}

describe("getDashboardTasks", () => {
  it("returns one row per task with joined assignee + project", () => {
    const rows = getDashboardTasks();
    expect(rows.length).toBe(tasks.length);
    const first = rows[0];
    expect(first).toBeDefined();
    expect(first?.assigneeName).toBeTruthy();
    expect(first?.assigneeInitials).toBeTruthy();
    expect(first?.projectName).toBeTruthy();
  });

  it("applies status filter server-side", () => {
    const rows = getDashboardTasks({ status: "done" });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.status).toBe("done");
  });

  it("applies priority filter server-side", () => {
    const rows = getDashboardTasks({ priority: "urgent" });
    for (const row of rows) expect(row.priority).toBe("urgent");
  });

  it("applies search filter server-side (case-insensitive, title)", () => {
    const sample = tasks[0];
    if (!sample) throw new Error("expected at least one task");
    const rows = getDashboardTasks({ q: sample.title.toUpperCase() });
    expect(rows.find((r) => r.id === sample.id)).toBeDefined();
  });
});

describe("toRow", () => {
  it("returns null when the status filter excludes the task", () => {
    const doneTask = tasks.find((t) => t.status === "done");
    if (!doneTask) throw new Error("expected at least one done task");
    expect(toRow(doneTask, { status: "backlog" })).toBeNull();
  });

  it("returns a row when no filter excludes it", () => {
    const sample = tasks[0];
    if (!sample) throw new Error("expected at least one task");
    const row = toRow(sample);
    expect(row?.id).toBe(sample.id);
  });

  it("matches a query against description, title, assignee, project, tags", () => {
    const sample = tasks[0];
    if (!sample) throw new Error("expected at least one task");
    const titleNeedle = sample.title.slice(0, 5);
    expect(toRow(sample, { q: titleNeedle })).not.toBeNull();
    expect(toRow(sample, { q: "zzz-nothing-matches" })).toBeNull();
  });
});

describe("filterDashboardTasks", () => {
  const rows: DashboardTaskRow[] = [
    baseRow({ id: "1", title: "Design dashboard", tags: ["design"] }),
    baseRow({ id: "2", title: "Write tests", tags: ["testing"] }),
    baseRow({ id: "3", title: "Ship release", assigneeName: "Bob" }),
  ];

  it("returns the input when the query is empty", () => {
    expect(filterDashboardTasks(rows, "")).toHaveLength(3);
    expect(filterDashboardTasks(rows, "   ")).toHaveLength(3);
  });

  it("matches case-insensitively across title, tags, assignee", () => {
    expect(filterDashboardTasks(rows, "DESIGN")).toHaveLength(1);
    expect(filterDashboardTasks(rows, "bob")).toHaveLength(1);
    expect(filterDashboardTasks(rows, "testing")).toHaveLength(1);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterDashboardTasks(rows, "quantum")).toHaveLength(0);
  });
});

describe("sortDashboardTasks", () => {
  const rows: DashboardTaskRow[] = [
    baseRow({ id: "1", title: "Bravo", priority: "low", dueDate: "2026-02-01" }),
    baseRow({ id: "2", title: "Charlie", priority: "urgent", dueDate: "2026-01-05" }),
    baseRow({ id: "3", title: "Alpha", priority: "high", dueDate: "2026-03-10" }),
  ];

  it("sorts by title ascending", () => {
    const sorted = sortDashboardTasks(rows, "title", "asc").map((r) => r.title);
    expect(sorted).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorts by title descending", () => {
    const sorted = sortDashboardTasks(rows, "title", "desc").map((r) => r.title);
    expect(sorted).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorts by priority (urgent first) ascending", () => {
    const sorted = sortDashboardTasks(rows, "priority", "asc").map(
      (r) => r.priority,
    );
    expect(sorted).toEqual(["urgent", "high", "low"]);
  });

  it("sorts by dueDate ascending", () => {
    const sorted = sortDashboardTasks(rows, "dueDate", "asc").map(
      (r) => r.dueDate,
    );
    expect(sorted).toEqual(["2026-01-05", "2026-02-01", "2026-03-10"]);
  });

  it("does not mutate the input array", () => {
    const before = rows.map((r) => r.id);
    sortDashboardTasks(rows, "title", "desc");
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it("sorts by project name ascending", () => {
    const projRows: DashboardTaskRow[] = [
      baseRow({ id: "1", projectName: "Zeta" }),
      baseRow({ id: "2", projectName: "Alpha" }),
      baseRow({ id: "3", projectName: "Mu" }),
    ];
    const sorted = sortDashboardTasks(projRows, "project", "asc").map(
      (r) => r.projectName,
    );
    expect(sorted).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  it("sorts by progress ascending (low → high)", () => {
    const progRows: DashboardTaskRow[] = [
      baseRow({ id: "1", progress: 80 }),
      baseRow({ id: "2", progress: 10 }),
      baseRow({ id: "3", progress: 50 }),
    ];
    const sorted = sortDashboardTasks(progRows, "progress", "asc").map(
      (r) => r.progress,
    );
    expect(sorted).toEqual([10, 50, 80]);
  });

  it("falls back to id for unknown sort keys", () => {
    // Cast to bypass the type guard — sortDashboardTasks must default to id.
    const sorted = sortDashboardTasks(
      rows,
      "id" as "title",
      "asc",
    ).map((r) => r.id);
    expect(sorted).toEqual(["1", "2", "3"]);
  });

  it("uses id as a stable tiebreaker when primary keys match", () => {
    const tied: DashboardTaskRow[] = [
      baseRow({ id: "b", progress: 50 }),
      baseRow({ id: "a", progress: 50 }),
      baseRow({ id: "c", progress: 50 }),
    ];
    const sorted = sortDashboardTasks(tied, "progress", "asc").map((r) => r.id);
    expect(sorted).toEqual(["a", "b", "c"]);
  });
});

describe("PRIORITY_ORDER / STATUS_ORDER", () => {
  it("orders priority urgent > high > medium > low", () => {
    expect(PRIORITY_ORDER.urgent).toBeGreaterThan(PRIORITY_ORDER.high);
    expect(PRIORITY_ORDER.high).toBeGreaterThan(PRIORITY_ORDER.medium);
    expect(PRIORITY_ORDER.medium).toBeGreaterThan(PRIORITY_ORDER.low);
  });

  it("orders status backlog → done", () => {
    expect(STATUS_ORDER.backlog).toBeLessThan(STATUS_ORDER.todo);
    expect(STATUS_ORDER.todo).toBeLessThan(STATUS_ORDER.in_progress);
    expect(STATUS_ORDER.in_progress).toBeLessThan(STATUS_ORDER.in_review);
    expect(STATUS_ORDER.in_review).toBeLessThan(STATUS_ORDER.done);
  });
});
