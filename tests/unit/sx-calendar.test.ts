// tests/unit/sx-calendar.test.ts
// Calendar month grid built from Planner task deadlines (Vietnam days,
// Monday-first weeks).

import { describe, expect, it } from "vitest";
import { buildSxCalendar } from "@/lib/sx-calendar";
import type { SxDataset, SxTask } from "@/lib/sx-dashboard";

const TODAY = "2026-10-07";

function task(over: Partial<SxTask> & { id: string }): SxTask {
  return {
    title: `Task ${over.id}`,
    employeeId: "e1",
    projectId: "p1",
    priority: "medium",
    status: "in_progress",
    progress: 0,
    deadline: "",
    notes: "",
    ...over,
  };
}

const DS: SxDataset = {
  source: "planner",
  employees: [{ id: "e1", name: "Nguyễn Văn An", initials: "NA", role: "", team: "T", avatar: "avatar-1" }],
  projects: [{ id: "p1", name: "Website", color: "#000" }],
  tasks: [
    task({ id: "a", deadline: "2026-10-03", status: "overdue" }),
    task({ id: "b", deadline: "2026-10-07" }),
    task({ id: "c", deadline: "2026-10-07", status: "completed", progress: 100 }),
    task({ id: "d", deadline: "2026-10-20", priority: "high" }),
    task({ id: "e", deadline: "2026-11-02" }),
    task({ id: "f", deadline: "" }),
  ],
  blockers: [],
  projectHealth: [],
  notifications: [],
};

describe("buildSxCalendar", () => {
  it("builds a Monday-first grid padded to full weeks", () => {
    const cal = buildSxCalendar(DS, TODAY);
    expect(cal.year).toBe(2026);
    expect(cal.month).toBe(10);
    // 1 Oct 2026 is a Thursday → 3 leading blanks (Mon, Tue, Wed).
    expect(cal.cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cal.cells[3]?.key).toBe("2026-10-01");
    expect(cal.cells.length % 7).toBe(0);
    expect(cal.cells.filter(Boolean)).toHaveLength(31);
  });

  it("puts tasks on their deadline day and marks today", () => {
    const cal = buildSxCalendar(DS, TODAY);
    const today = cal.cells.find((c) => c?.key === TODAY);
    expect(today?.isToday).toBe(true);
    expect(today?.tasks.map((t) => t.id)).toEqual(["b", "c"]);
    expect(today?.tasks[0]).toMatchObject({ projectName: "Website", employeeName: "Nguyễn Văn An", overdue: false });
  });

  it("flags overdue days and counts open / overdue tasks", () => {
    const cal = buildSxCalendar(DS, TODAY);
    expect(cal.cells.find((c) => c?.key === "2026-10-03")?.hasOverdue).toBe(true);
    expect(cal.overdueCount).toBe(1);
    expect(cal.openCount).toBe(4); // a, b, d, e — open tasks that have a deadline
  });

  it("lists upcoming open tasks from today onwards, soonest first", () => {
    expect(buildSxCalendar(DS, TODAY).upcoming.map((t) => t.id)).toEqual(["b", "d", "e"]);
  });

  it("handles an empty dataset", () => {
    const cal = buildSxCalendar({ ...DS, tasks: [] }, TODAY);
    expect(cal.openCount).toBe(0);
    expect(cal.upcoming).toEqual([]);
    expect(cal.cells.filter(Boolean).every((c) => c!.tasks.length === 0)).toBe(true);
  });
});
