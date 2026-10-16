// tests/unit/v2-core.test.ts
// Every overview widget (KPI cards, health ring, "Công việc cần chú ý",
// project table) must count the same filtered tasks with the same rules,
// so the numbers reconcile with each other.

import { describe, expect, it } from "vitest";
import { createHelpers } from "@/components/v2/v2-core";
import type { V2Project, V2Task } from "@/lib/v2/v2-model";

const TODAY = new Date(2026, 9, 16); // 16/10/2026 local
const h = createHelpers(TODAY);

function task(over: Partial<V2Task> = {}): V2Task {
  return {
    id: "T-001",
    pid: "p",
    title: "t",
    owner: "Bao Dau",
    team: "3 - Tech",
    project: "DEV Manage Task",
    start: "2026-10-01",
    deadline: "",
    risk: "medium",
    status: "todo",
    progress: 0,
    ...over,
  };
}

/** Mirrors the live "DEV Manage Task" plan: 3 done, 6 not started. */
const DEV: V2Task[] = [
  task({ pid: "scope", deadline: "2026-10-24" }),
  task({ pid: "code", deadline: "2026-10-18" }),
  task({ pid: "spec", deadline: "2026-10-19" }),
  task({ pid: "needs", deadline: "2026-10-21" }),
  task({ pid: "user-test", owner: "Chưa giao" }),
  task({ pid: "proto", owner: "Chưa giao" }),
  task({ pid: "testing", status: "done", progress: 100 }),
  task({ pid: "feedback", status: "done", progress: 100 }),
  task({ pid: "deploy", status: "done", progress: 100 }),
];

const MIXED: V2Task[] = [
  task({ pid: "a", status: "done", progress: 100 }),
  task({ pid: "b", status: "working", progress: 50, deadline: "2026-10-20" }),
  task({ pid: "c", status: "working", progress: 50, deadline: "2026-10-10" }),
  task({ pid: "d", status: "todo", deadline: "2026-10-01" }),
  task({ pid: "e", status: "blocked", progress: 20 }),
  task({ pid: "f", status: "todo" }),
];

describe("countStates", () => {
  it("counts the live DEV plan as 3 done and 6 not started", () => {
    expect(h.countStates(DEV)).toEqual({ total: 9, done: 3, working: 0, overdue: 0, blocked: 0, todo: 6 });
  });

  it("puts every task in exactly one state, so the KPI cards add up to the total", () => {
    const c = h.countStates(MIXED);
    expect(c).toEqual({ total: 6, done: 1, working: 1, overdue: 2, blocked: 1, todo: 1 });
    expect(c.done + c.working + c.overdue + c.blocked + c.todo).toBe(c.total);
  });

  it("returns zeros for an empty list", () => {
    expect(h.countStates([])).toEqual({ total: 0, done: 0, working: 0, overdue: 0, blocked: 0, todo: 0 });
  });
});

describe("inAttention", () => {
  it("lists every unfinished task, including not-started ones", () => {
    expect(DEV.filter(h.inAttention).map((t) => t.pid)).toEqual(["scope", "code", "spec", "needs", "user-test", "proto"]);
  });

  it("matches total minus done for any mix of states", () => {
    const c = h.countStates(MIXED);
    expect(MIXED.filter(h.inAttention)).toHaveLength(c.total - c.done);
  });
});

describe("projectHealth", () => {
  it("is on track when nothing is late or blocked", () => {
    expect(h.projectHealth(DEV)).toBe("onTrack");
  });

  it("is at risk when under 30% of tasks are overdue", () => {
    const tasks = [...DEV.slice(0, 7), task({ pid: "late", deadline: "2026-10-10" })];
    expect(h.projectHealth(tasks)).toBe("atRisk");
  });

  it("is blocked when at least 30% of tasks are overdue", () => {
    const late = (pid: string) => task({ pid, deadline: "2026-10-10" });
    expect(h.projectHealth([late("x"), late("y"), late("z"), ...DEV.slice(0, 7)])).toBe("blocked");
  });

  it("is blocked when any task is blocked", () => {
    expect(h.projectHealth([...DEV, task({ pid: "stuck", status: "blocked" })])).toBe("blocked");
  });

  it("is on track for an empty list", () => {
    expect(h.projectHealth([])).toBe("onTrack");
  });
});

describe("projectStats", () => {
  const PROJECTS: V2Project[] = [
    { name: "DEV Manage Task", deadline: "2026-10-24", progress: 33, done: 3, total: 9, health: "onTrack", group: "3 - Tech" },
    { name: "Marketing Manage Task", deadline: "2026-10-16", progress: 50, done: 0, total: 1, health: "onTrack", group: "Marketing" },
  ];

  it("counts done/total and progress from the given tasks", () => {
    expect(h.projectStats(PROJECTS, DEV)).toEqual([
      { name: "DEV Manage Task", deadline: "2026-10-24", progress: 33, tasks: 9, done: 3, health: "onTrack", group: "3 - Tech" },
    ]);
  });

  it("follows the filtered list instead of the precomputed totals", () => {
    const thisWeek = DEV.filter((t) => t.deadline && t.deadline <= "2026-10-22");
    expect(h.projectStats(PROJECTS, thisWeek)).toEqual([
      { name: "DEV Manage Task", deadline: "2026-10-24", progress: 0, tasks: 3, done: 0, health: "onTrack", group: "3 - Tech" },
    ]);
  });

  it("drops projects with no task in the list", () => {
    expect(h.projectStats(PROJECTS, [])).toEqual([]);
  });

  it("uses the same health rule as projectHealth", () => {
    const late = DEV.map((t) => (t.status === "todo" ? { ...t, deadline: "2026-10-10" } : t));
    expect(h.projectStats(PROJECTS, late)[0].health).toBe(h.projectHealth(late));
  });
});
