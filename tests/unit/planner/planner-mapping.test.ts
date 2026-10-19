// tests/unit/planner/planner-mapping.test.ts
// Pure mapping between Microsoft Planner resources and the SUNEXT template
// dataset (lib/planner/planner-mapping.ts), plus the modal-edit → Graph
// PATCH translation.

import { describe, expect, it } from "vitest";
import {
  ALLOWED_PLANNER_PLAN_TITLES,
  EXCLUDED_PLANNER_PLAN_TITLES,
  PLANNER_UNASSIGNED_ID,
  buildPlannerDataset,
  filterPlannerPlans,
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

describe("filterPlannerPlans", () => {
  it("exports the exact allowed and excluded plan lists", () => {
    expect(ALLOWED_PLANNER_PLAN_TITLES).toEqual([
      "Sunext Manage Task",
      "DEV Manage Task",
      "Marketing Manage Task",
    ]);
    expect(EXCLUDED_PLANNER_PLAN_TITLES).toEqual([
      "test",
      "To do list",
      "General Tasks",
      "Test 1",
    ]);
  });

  it("removes test, To do list, General Tasks, and Test 1 and keeps only the 3 active plans in canonical order", () => {
    const rawPlans = [
      { id: "p-test", title: "test", groupId: "g1", groupName: "1 - Company" },
      { id: "p-todo", title: "To do list", groupId: "g1", groupName: "1 - Company" },
      { id: "p-gen", title: "General Tasks", groupId: "g1", groupName: "1 - Company" },
      { id: "p-mkt", title: "Marketing Manage Task", groupId: "g3", groupName: "Marketing" },
      { id: "p-test1", title: "Test 1", groupId: "g2", groupName: "3 - Tech" },
      { id: "p-dev", title: "DEV Manage Task", groupId: "g2", groupName: "3 - Tech" },
      { id: "p-sx", title: "Sunext Manage Task", groupId: "g1", groupName: "1 - Company" },
    ];
    expect(filterPlannerPlans(rawPlans).map((p) => p.title)).toEqual([
      "Sunext Manage Task",
      "DEV Manage Task",
      "Marketing Manage Task",
    ]);
  });

  it("returns empty array when all plans are in the excluded list (case-insensitive and trimmed)", () => {
    const legacyOnly = [
      { id: "1", title: " TEST " },
      { id: "2", title: "to do list" },
      { id: "3", title: "General Tasks " },
      { id: "4", title: "test 1" },
    ];
    expect(filterPlannerPlans(legacyOnly)).toEqual([]);
  });
});

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
    expect(byId.get(U1)).toMatchObject({ name: "Lan Nguyen", initials: "LN", role: "Dev", team: "Tech" });
    expect(byId.get(U2)?.name).toMatch(/^Thành viên /);
    expect(byId.get(U2)?.team).toBe("Tech");
    expect(byId.get(PLANNER_UNASSIGNED_ID)?.name).toBe("Chưa giao");
  });

  it("puts assignees of the same plan in the plan's group even when their AD departments differ", () => {
    const samePlan = buildPlannerDataset(
      {
        ...src,
        tasks: [
          task({ id: "m1", planId: "plan2", assignments: { [U1]: {} } }),
          task({ id: "m2", planId: "plan2", assignments: { [U2]: {} } }),
        ],
        members: {
          g2: [
            { id: U1, displayName: "My Nguyen", jobTitle: null, department: "1 - Company" },
            { id: U2, displayName: "Thu Nguyen", jobTitle: null, department: "Marketing" },
          ],
        },
      },
      NOW,
    );
    expect(samePlan.employees.map((e) => e.team)).toEqual(["Marketing", "Marketing"]);
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

  it("excludes legacy plans (test, To do list, General Tasks, Test 1) and their tasks from the dataset", () => {
    const mixed: PlannerSource = {
      tenantId: "tid",
      plans: [
        { id: "p-test", title: "test", groupId: "g1", groupName: "1 - Company" },
        { id: "p-todo", title: "To do list", groupId: "g1", groupName: "1 - Company" },
        { id: "p-gen", title: "General Tasks", groupId: "g1", groupName: "1 - Company" },
        { id: "p-sx", title: "Sunext Manage Task", groupId: "g1", groupName: "1 - Company" },
        { id: "p-test1", title: "Test 1", groupId: "g2", groupName: "3 - Tech" },
        { id: "p-dev", title: "DEV Manage Task", groupId: "g2", groupName: "3 - Tech" },
        { id: "p-mkt", title: "Marketing Manage Task", groupId: "g3", groupName: "Marketing" },
      ],
      tasks: [
        task({ id: "t-old-1", planId: "p-test" }),
        task({ id: "t-old-2", planId: "p-todo" }),
        task({ id: "t-old-3", planId: "p-gen" }),
        task({ id: "t-old-4", planId: "p-test1" }),
        task({ id: "t-sx", planId: "p-sx", assignments: { [U1]: {} } }),
        task({ id: "t-dev", planId: "p-dev", assignments: { [U1]: {} } }),
        task({ id: "t-mkt", planId: "p-mkt", assignments: { [U2]: {} } }),
      ],
      members: src.members,
    };
    const filteredDs = buildPlannerDataset(mixed, NOW);
    expect(filteredDs.projects.map((p) => p.name)).toEqual([
      "Sunext Manage Task",
      "DEV Manage Task",
      "Marketing Manage Task",
    ]);
    expect(filteredDs.tasks.map((t) => t.id)).toEqual(["t-sx", "t-dev", "t-mkt"]);
    expect(Object.keys(filteredDs.projectLinks ?? {})).toEqual(["p-sx", "p-dev", "p-mkt"]);
    expect(Object.keys(filteredDs.taskEtags ?? {})).toEqual(["t-sx", "t-dev", "t-mkt"]);
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
