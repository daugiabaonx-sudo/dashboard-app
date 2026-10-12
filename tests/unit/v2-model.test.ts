import { describe, expect, it } from "vitest";
import type { SxDataset, SxTask } from "@/lib/sx-dashboard";
import { buildV2Model, computeTrend, deltaOf, snapshotAt, v2StatusOf, type V2Task } from "@/lib/v2/v2-model";

const TODAY = new Date(2026, 9, 13); // 13/10/2026 local

function task(over: Partial<SxTask> = {}): SxTask {
  return {
    id: "p1",
    title: "Task",
    employeeId: "e1",
    projectId: "plan1",
    priority: "medium",
    status: "in_progress",
    progress: 50,
    deadline: "2026-10-20",
    notes: "",
    createdAt: "2026-10-01",
    ...over,
  };
}

function dataset(over: Partial<SxDataset> = {}): SxDataset {
  return {
    source: "planner",
    employees: [
      { id: "e1", name: "Bao Dau", initials: "BD", role: "Dev", team: "Tech", avatar: "avatar-1" },
      { id: "planner-unassigned", name: "Chưa giao", initials: "?", role: "—", team: "—", avatar: "avatar-2" },
    ],
    projects: [
      { id: "plan1", name: "Sunext Manage Task", color: "#000", group: "1 - Company" },
      { id: "plan2", name: "Empty plan", color: "#000" },
    ],
    tasks: [task()],
    blockers: [],
    projectHealth: [
      { projectId: "plan1", progress: 50, deadline: "2026-10-20", tasksDone: 0, tasksTotal: 1, health: "at_risk" },
      { projectId: "plan2", progress: 0, deadline: "", tasksDone: 0, tasksTotal: 0, health: "on_track" },
    ],
    notifications: [
      { id: "n1", title: "Mới", message: "m", color: "#f00", read: false },
      { id: "n2", title: "Cũ", message: "m", color: "#0f0", read: true },
    ],
    ...over,
  };
}

function v2(over: Partial<V2Task> = {}): V2Task {
  return {
    id: "T-001",
    pid: "p1",
    title: "t",
    owner: "A",
    team: "Tech",
    project: "P",
    start: "2026-10-01",
    deadline: "2026-10-20",
    risk: "medium",
    status: "working",
    progress: 50,
    createdAt: "2026-10-01",
    ...over,
  };
}

describe("v2StatusOf", () => {
  it("maps Planner statuses onto template statuses", () => {
    expect(v2StatusOf("completed")).toBe("done");
    expect(v2StatusOf("not_started")).toBe("todo");
    expect(v2StatusOf("blocked")).toBe("blocked");
    expect(v2StatusOf("in_progress")).toBe("working");
    expect(v2StatusOf("overdue")).toBe("working");
  });
});

describe("buildV2Model", () => {
  it("resolves owner, team, project names and keeps the Planner id", () => {
    const m = buildV2Model(dataset(), TODAY);
    expect(m.tasks[0]).toMatchObject({
      id: "T-001",
      pid: "p1",
      owner: "Bao Dau",
      team: "Tech",
      project: "Sunext Manage Task",
      start: "2026-10-01",
      deadline: "2026-10-20",
      risk: "medium",
      status: "working",
      progress: 50,
    });
  });

  it("numbers display codes oldest-first", () => {
    const m = buildV2Model(
      dataset({ tasks: [task({ id: "b", createdAt: "2026-10-05" }), task({ id: "a", createdAt: "2026-09-01" })] }),
      TODAY,
    );
    expect(m.tasks.find((t) => t.pid === "a")?.id).toBe("T-001");
    expect(m.tasks.find((t) => t.pid === "b")?.id).toBe("T-002");
  });

  it("handles unassigned / unknown references and missing dates", () => {
    const m = buildV2Model(
      dataset({
        tasks: [
          task({ id: "x", employeeId: "planner-unassigned", projectId: "nope", deadline: "", createdAt: undefined }),
          task({ id: "y", employeeId: "ghost", deadline: "2026-10-01", createdAt: undefined, progress: 140 }),
          task({ id: "z", deadline: "2026-12-01", createdAt: undefined }),
        ],
      }),
      TODAY,
    );
    const [x, y, z] = ["x", "y", "z"].map((id) => m.tasks.find((t) => t.pid === id));
    expect(x).toMatchObject({ owner: "Chưa giao", team: "Chưa có team", project: "Không có dự án", deadline: "", start: "2026-10-13" });
    expect(y).toMatchObject({ owner: "Chưa giao", start: "2026-09-24", progress: 100 });
    expect(z?.start).toBe("2026-10-13");
  });

  it("builds projects from projectHealth, dropping empty plans", () => {
    const m = buildV2Model(dataset(), TODAY);
    expect(m.projects).toEqual([
      { name: "Sunext Manage Task", deadline: "2026-10-20", progress: 50, done: 0, total: 1, health: "atRisk", group: "1 - Company" },
    ]);
  });

  it("maps blockers, unread notifications, teams and the source note", () => {
    const m = buildV2Model(
      dataset({
        sourceNote: "note",
        blockers: [
          { id: "b1", taskId: "p1", issue: "Kẹt", severity: "high", daysBlocked: 3, actionRequired: "Escalate", taskTitle: "Task", employeeId: "e1", projectId: "plan1", status: "open" },
          { id: "b2", taskId: "p1", issue: "Chờ", severity: "medium", daysBlocked: 1, actionRequired: "Approve", taskTitle: "", employeeId: "ghost", projectId: "zz", status: "open" },
        ],
      }),
      TODAY,
    );
    expect(m.blockers[0]).toEqual({ id: "b1", issue: "Kẹt", project: "Sunext Manage Task", sev: "high", days: 3, action: "Escalate", owner: "Bao Dau", detail: "Ảnh hưởng công việc: Task" });
    expect(m.blockers[1]).toMatchObject({ action: "", owner: "Chưa giao", project: "", detail: "" });
    expect(m.notifications).toEqual([{ title: "Mới", message: "m", color: "#f00" }]);
    expect(m.teams).toEqual(["Tech"]);
    expect(m.sourceNote).toBe("note");
  });

  it("omits sourceNote when absent", () => {
    expect("sourceNote" in buildV2Model(dataset(), TODAY)).toBe(false);
  });
});

describe("snapshotAt", () => {
  it("counts states as of a past day", () => {
    const tasks = [
      v2({ createdAt: "2026-10-10" }), // not created yet on 10-05
      v2({ status: "done", completedAt: "2026-10-04" }),
      v2({ status: "done", completedAt: "2026-10-08" }), // still open on 10-05
      v2({ deadline: "2026-10-02" }), // late on 10-05
      v2({ status: "todo" }),
    ];
    expect(snapshotAt(tasks, "2026-10-05", "2026-10-13")).toEqual({ total: 4, done: 1, work: 1, late: 1, block: 0 });
  });

  it("uses current status for today when completion/blocked dates are unknown", () => {
    const tasks = [v2({ status: "done", createdAt: undefined }), v2({ status: "blocked" })];
    expect(snapshotAt(tasks, "2026-10-13", "2026-10-13")).toMatchObject({ done: 1, block: 1 });
    expect(snapshotAt(tasks, "2026-10-06", "2026-10-13")).toMatchObject({ done: 0, block: 0, work: 2 });
  });
});

describe("deltaOf", () => {
  it("formats week-over-week change with tone", () => {
    expect(deltaOf("done", 10, 12)).toEqual(["↑ 20%", "good"]);
    expect(deltaOf("late", 4, 2)).toEqual(["↓ 50%", "good"]);
    expect(deltaOf("late", 2, 3)).toEqual(["↑ 50%", "badc"]);
    expect(deltaOf("work", 5, 4)).toEqual(["↓ 20%", "badc"]);
    expect(deltaOf("total", 3, 3)).toEqual(["0%", ""]);
    expect(deltaOf("block", 0, 2)).toEqual(["↑ 2", "badc"]);
  });
});

describe("computeTrend", () => {
  it("returns 7 weekly points ending today and the delta vs last week", () => {
    const tasks = [v2({ createdAt: "2026-10-01" }), v2({ createdAt: "2026-10-12", status: "done", completedAt: "2026-10-12" })];
    const trend = computeTrend(tasks, TODAY);
    expect(trend.spark.total).toHaveLength(7);
    expect(trend.spark.total.at(-1)).toBe(2);
    expect(trend.spark.total.at(-2)).toBe(1);
    expect(trend.delta.total).toEqual(["↑ 100%", "good"]);
    expect(trend.delta.done).toEqual(["↑ 1", "good"]);
  });

  it("handles a single point", () => {
    const trend = computeTrend([v2()], TODAY, 1);
    expect(trend.spark.total).toEqual([1]);
    expect(trend.delta.total).toEqual(["0%", ""]);
  });
});
