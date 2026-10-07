// tests/unit/sx-reports.test.ts
// Reports page numbers are computed from the Planner dataset only.

import { describe, expect, it } from "vitest";
import { buildSxReport } from "@/lib/sx-reports";
import type { SxDataset, SxTask } from "@/lib/sx-dashboard";

const TODAY = "2026-10-07"; // Wednesday → week starts Mon 2026-10-05

function task(over: Partial<SxTask> & { id: string }): SxTask {
  return {
    title: `Task ${over.id}`,
    employeeId: "e1",
    projectId: "p1",
    priority: "medium",
    status: "in_progress",
    progress: 50,
    deadline: "",
    notes: "",
    ...over,
  };
}

const DS: SxDataset = {
  source: "planner",
  employees: [{ id: "e1", name: "An", initials: "A", role: "", team: "T", avatar: "avatar-1" }],
  projects: [{ id: "p1", name: "Website", color: "#7b2ff2" }],
  tasks: [
    task({ id: "1", status: "completed", progress: 100, createdAt: "2026-09-28", completedAt: "2026-10-06" }),
    task({ id: "2", status: "completed", progress: 100, createdAt: "2026-09-29", completedAt: "2026-10-02" }),
    task({ id: "3", status: "overdue", deadline: "2026-10-01", createdAt: "2026-10-05" }),
    task({ id: "4", status: "overdue", deadline: "2026-09-20", createdAt: "2026-08-01" }),
    task({ id: "5", status: "not_started", deadline: "2026-10-20" }),
  ],
  blockers: [],
  projectHealth: [{ projectId: "p1", progress: 70, deadline: "2026-10-20", tasksDone: 2, tasksTotal: 5, health: "at_risk" }],
  notifications: [],
};

describe("buildSxReport", () => {
  it("computes totals and the completion rate", () => {
    const r = buildSxReport(DS, TODAY);
    expect(r.total).toBe(5);
    expect(r.completed).toBe(2);
    expect(r.open).toBe(3);
    expect(r.overdue).toBe(2);
    expect(r.completionRate).toBe(40);
  });

  it("counts tasks completed this week (Monday-based, Vietnam days)", () => {
    expect(buildSxReport(DS, TODAY).completedThisWeek).toBe(1);
  });

  it("builds 8 weekly velocity buckets ending with the current week", () => {
    const { velocity } = buildSxReport(DS, TODAY);
    expect(velocity).toHaveLength(8);
    expect(velocity[7]).toEqual({ week: "Tuần này", completed: 1, created: 1 });
    expect(velocity[6]).toEqual({ week: "28/09", completed: 1, created: 2 });
    expect(velocity[0].week).toBe("17/08");
    const created = velocity.reduce((s, v) => s + v.created, 0);
    expect(created).toBe(3); // task 4 was created before the 8-week window
  });

  it("lists project health from the dataset with plan names", () => {
    expect(buildSxReport(DS, TODAY).projects).toEqual([
      { id: "p1", name: "Website", color: "#7b2ff2", progress: 70, tasksDone: 2, tasksTotal: 5, health: "at_risk" },
    ]);
  });

  it("lists overdue tasks, oldest deadline first, with plan and assignee names", () => {
    const { overdueTasks } = buildSxReport(DS, TODAY);
    expect(overdueTasks.map((t) => t.id)).toEqual(["4", "3"]);
    expect(overdueTasks[0]).toMatchObject({ projectName: "Website", employeeName: "An", deadline: "2026-09-20" });
  });

  it("handles an empty dataset without dividing by zero", () => {
    const r = buildSxReport({ ...DS, tasks: [], projectHealth: [], projects: [] }, TODAY);
    expect(r.completionRate).toBe(0);
    expect(r.projects).toEqual([]);
    expect(r.overdueTasks).toEqual([]);
    expect(r.velocity.every((v) => v.completed === 0 && v.created === 0)).toBe(true);
  });
});
