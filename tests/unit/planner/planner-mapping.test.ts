// tests/unit/planner/planner-mapping.test.ts
// Pure mapping between Microsoft Planner resources and the SUNEXT template
// dataset (lib/planner/planner-mapping.ts), plus the modal-edit → Graph
// PATCH translation.

import { describe, expect, it } from "vitest";
import {
  PLANNER_UNASSIGNED_ID,
  buildPlannerDataset,
  mapPlannerPriority,
  mapPlannerStatus,
  mapPlannerTask,
  plannerPatchFromEdit,
  plannerPlanUrl,
  type PlannerSource,
} from "@/lib/planner/planner-mapping";
import type { PlannerTask } from "@/lib/planner/types";
import type { SxTask } from "@/lib/sx-dashboard";

// 2026-10-07 10:00 in Vietnam (UTC+7).
const NOW = Date.parse("2026-10-07T03:00:00Z");
const U1 = "aaaaaaaa-0000-0000-0000-000000000001";
const U2 = "aaaaaaaa-0000-0000-0000-000000000002";

function task(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: "t1",
    planId: "plan1",
    bucketId: null,
    title: "Task",
    percentComplete: 0,
    priority: 5,
    startDateTime: null,
    dueDateTime: null,
    createdDateTime: "2026-10-01T00:00:00Z",
    completedDateTime: null,
    assignments: {},
    "@odata.etag": 'W/"e1"',
    ...overrides,
  };
}

describe("mapPlannerPriority", () => {
  it.each([
    [0, "high"],
    [1, "high"],
    [3, "high"],
    [5, "medium"],
    [7, "medium"],
    [9, "low"],
    [10, "low"],
  ])("Planner %i → %s", (p, expected) => {
    expect(mapPlannerPriority(p)).toBe(expected);
  });
});

describe("mapPlannerStatus", () => {
  it("100% is completed even when past due", () => {
    expect(mapPlannerStatus(task({ percentComplete: 100, dueDateTime: "2026-01-01T00:00:00Z" }), NOW)).toBe(
      "completed",
    );
  });

  it("past Vietnam calendar day is overdue", () => {
    expect(mapPlannerStatus(task({ dueDateTime: "2026-10-06T05:00:00Z" }), NOW)).toBe("overdue");
  });

  it("due today (Vietnam time) is not overdue yet", () => {
    // 2026-10-06T17:00Z is midnight 2026-10-07 in Vietnam.
    expect(mapPlannerStatus(task({ dueDateTime: "2026-10-06T17:00:00Z", percentComplete: 50 }), NOW)).toBe(
      "in_progress",
    );
  });

  it("0% without due date is not started", () => {
    expect(mapPlannerStatus(task(), NOW)).toBe("not_started");
  });
});

describe("mapPlannerTask", () => {
  it("maps fields and uses the first assignee", () => {
    const t = task({
      percentComplete: 50,
      priority: 1,
      dueDateTime: "2026-10-06T17:00:00Z",
      assignments: { [U2]: {}, [U1]: {} },
    });
    expect(mapPlannerTask(t, NOW)).toEqual({
      id: "t1",
      title: "Task",
      employeeId: U2,
      projectId: "plan1",
      priority: "high",
      status: "in_progress",
      progress: 50,
      deadline: "2026-10-07",
      notes: "",
      createdAt: "2026-10-01",
    });
  });

  it("falls back to the unassigned pseudo-employee and empty deadline", () => {
    const mapped = mapPlannerTask(task(), NOW);
    expect(mapped.employeeId).toBe(PLANNER_UNASSIGNED_ID);
    expect(mapped.deadline).toBe("");
    expect(mapped.completedAt).toBeUndefined();
  });

  it("records created / completed days in Vietnam time", () => {
    const mapped = mapPlannerTask(
      task({ createdDateTime: "2026-09-30T18:00:00Z", percentComplete: 100, completedDateTime: "2026-10-05T20:00:00Z" }),
      NOW,
    );
    expect(mapped.createdAt).toBe("2026-10-01");
    expect(mapped.completedAt).toBe("2026-10-06");
  });
});

describe("plannerPlanUrl", () => {
  it("builds the Planner web board link", () => {
    expect(plannerPlanUrl("plan_A-1", "tenant-1")).toBe(
      "https://planner.cloud.microsoft/webui/plan/plan_A-1/view/board?tid=tenant-1",
    );
  });
});

describe("buildPlannerDataset", () => {
  const src: PlannerSource = {
    tenantId: "tid",
    plans: [
      { id: "plan1", title: "Dev", groupId: "g1", groupName: "Tech" },
      { id: "plan2", title: "Campaign", groupId: "g2", groupName: "Marketing" },
    ],
    tasks: [
      task({ id: "t1", planId: "plan1", percentComplete: 100, assignments: { [U1]: {} } }),
      task({ id: "t2", planId: "plan1", dueDateTime: "2026-10-01T05:00:00Z", assignments: { [U2]: {} } }),
      task({ id: "t3", planId: "plan2", "@odata.etag": 'W/"e3"' }),
    ],
    members: {
      g1: [
        { id: U1, displayName: "Lan Nguyen", jobTitle: "Dev", department: "R&D" },
        { id: U2, displayName: null, jobTitle: null, department: null },
      ],
    },
  };
  const ds = buildPlannerDataset(src, NOW);

  it("marks the dataset as Planner-sourced with links and etags", () => {
    expect(ds.source).toBe("planner");
    expect(ds.projectLinks?.plan2).toBe(plannerPlanUrl("plan2", "tid"));
    expect(ds.taskEtags).toEqual({ t1: 'W/"e1"', t2: 'W/"e1"', t3: 'W/"e3"' });
  });

  it("turns plans into projects tagged with their group", () => {
    expect(ds.projects.map((p) => [p.id, p.name, p.group])).toEqual([
      ["plan1", "Dev", "Tech"],
      ["plan2", "Campaign", "Marketing"],
    ]);
    expect(ds.projects[0].color).not.toBe(ds.projects[1].color);
  });

  it("builds employees from assignees, with fallbacks for unknown names", () => {
    const byId = new Map(ds.employees.map((e) => [e.id, e]));
    expect(byId.get(U1)).toMatchObject({ name: "Lan Nguyen", initials: "LN", role: "Dev", team: "R&D" });
    expect(byId.get(U2)?.name).toMatch(/^Thành viên /);
    expect(byId.get(U2)?.team).toBe("Tech");
    expect(byId.get(PLANNER_UNASSIGNED_ID)?.name).toBe("Chưa giao");
  });

  it("fills names from looked-up users (User.Read.All) when member lists lack them", () => {
    const withUsers = buildPlannerDataset(
      { ...src, users: [{ id: U2, displayName: "Minh Tran", jobTitle: "PM", department: null }] },
      NOW,
    );
    const u2 = withUsers.employees.find((e) => e.id === U2);
    expect(u2).toMatchObject({ name: "Minh Tran", initials: "MT", role: "PM", team: "Tech" });
    expect(withUsers.employees.find((e) => e.id === U1)?.name).toBe("Lan Nguyen");
  });

  it("computes per-project health from the tasks", () => {
    const plan1 = ds.projectHealth.find((h) => h.projectId === "plan1");
    expect(plan1).toMatchObject({ tasksDone: 1, tasksTotal: 2, progress: 50, health: "blocked" });
    const plan2 = ds.projectHealth.find((h) => h.projectId === "plan2");
    expect(plan2).toMatchObject({ tasksDone: 0, tasksTotal: 1, health: "on_track" });
  });

  it("has no blockers or notifications (Planner has no such concepts)", () => {
    expect(ds.blockers).toEqual([]);
    expect(ds.notifications).toEqual([]);
  });

  it("omits the unassigned employee when every task is assigned", () => {
    const only = buildPlannerDataset({ ...src, tasks: [src.tasks[0]] }, NOW);
    expect(only.employees.map((e) => e.id)).toEqual([U1]);
  });
});

describe("plannerPatchFromEdit", () => {
  const base: SxTask = {
    id: "t1",
    title: "Task",
    employeeId: U1,
    projectId: "plan1",
    priority: "medium",
    status: "in_progress",
    progress: 40,
    deadline: "2026-10-10",
    notes: "",
  };
  const edit = { status: base.status, priority: base.priority, progress: base.progress, notes: "", deadline: base.deadline };

  it("returns null when nothing Planner-relevant changed (notes are not synced)", () => {
    expect(plannerPatchFromEdit(base, { ...edit, notes: "local only" })).toBeNull();
  });

  it("status drives percentComplete when the status changed", () => {
    expect(plannerPatchFromEdit(base, { ...edit, status: "completed" })).toEqual({ percentComplete: 100 });
    expect(plannerPatchFromEdit(base, { ...edit, status: "not_started" })).toEqual({ percentComplete: 0 });
    expect(plannerPatchFromEdit({ ...base, status: "not_started", progress: 0 }, { ...edit, status: "in_progress", progress: 0 })).toEqual({
      percentComplete: 1,
    });
  });

  it("progress is sent as-is when only the slider moved", () => {
    expect(plannerPatchFromEdit(base, { ...edit, progress: 75 })).toEqual({ percentComplete: 75 });
  });

  it("maps priority to Planner's values", () => {
    expect(plannerPatchFromEdit(base, { ...edit, priority: "high" })).toEqual({ priority: 3 });
    expect(plannerPatchFromEdit(base, { ...edit, priority: "low" })).toEqual({ priority: 9 });
  });

  it("sends the deadline as noon Vietnam time, or null to clear it", () => {
    expect(plannerPatchFromEdit(base, { ...edit, deadline: "2026-11-01" })).toEqual({
      dueDateTime: "2026-11-01T05:00:00Z",
    });
    expect(plannerPatchFromEdit(base, { ...edit, deadline: "" })).toEqual({ dueDateTime: null });
  });

  it("ignores a missing deadline field", () => {
    const { deadline: _omit, ...noDeadline } = edit;
    expect(plannerPatchFromEdit(base, noDeadline)).toBeNull();
  });
});
