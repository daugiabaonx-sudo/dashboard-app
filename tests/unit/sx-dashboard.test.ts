// Unit tests for lib/sx-dashboard.ts — the pure data layer that adapts the
// app's Task/Project/User model to the SUNEXT template's dashboard model.
import { describe, expect, it } from "vitest";
import {
  buildSxDataset,
  calcKpis,
  daysLabel,
  filterBlockers,
  filterTasks,
  formatDeadline,
  healthSummary,
  mapTaskStatus,
  percentOf,
  riskLabel,
  riskScore,
  vnDateLabel,
  type SxDataset,
  type SxFilters,
  type SxTask,
} from "@/lib/sx-dashboard";
import type { Notification, Project, Task, User } from "@/lib/types";

const NOW = new Date("2026-10-06T10:00:00Z").getTime();
const ALL: SxFilters = { period: "all", team: "all", project: "all", search: "" };

function user(id: string, over: Partial<User> = {}): User {
  return {
    id,
    name: `User ${id}`,
    email: `${id}@x.io`,
    role: "member",
    avatarColor: "#000",
    initials: id.toUpperCase(),
    department: "Engineering",
    joinedAt: "2024-01-01",
    capacityHours: 40,
    ...over,
  };
}

function project(id: string, over: Partial<Project> = {}): Project {
  return {
    id,
    name: `Project ${id}`,
    description: "",
    status: "active",
    priority: "medium",
    ownerId: "u1",
    memberIds: [],
    startDate: "2026-09-01",
    dueDate: "2026-11-01",
    progress: 50,
    budget: 0,
    spent: 0,
    tags: [],
    ...over,
  };
}

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "in_progress",
    priority: "medium",
    assigneeId: "u1",
    reporterId: "u1",
    projectId: "p1",
    dueDate: "2026-10-20",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    tags: [],
    estimatedHours: 1,
    loggedHours: 0,
    progress: 40,
    comments: 0,
    attachments: 0,
    ...over,
  };
}

const notification: Notification = {
  id: "n1",
  type: "deadline",
  title: "Task overdue",
  body: "Something is late",
  createdAt: "2026-10-06T00:00:00Z",
  read: false,
  link: "/tasks",
} as Notification;

describe("mapTaskStatus", () => {
  it("maps done to completed even when past due", () => {
    expect(mapTaskStatus(task("t", { status: "done", dueDate: "2026-01-01" }), NOW)).toBe("completed");
  });
  it("blocked flag wins over overdue", () => {
    expect(mapTaskStatus(task("t", { blocked: true, dueDate: "2026-01-01" }), NOW)).toBe("blocked");
  });
  it("past-due unfinished tasks are overdue", () => {
    expect(mapTaskStatus(task("t", { dueDate: "2026-10-01" }), NOW)).toBe("overdue");
  });
  it("in_review counts as in_progress", () => {
    expect(mapTaskStatus(task("t", { status: "in_review" }), NOW)).toBe("in_progress");
  });
  it("todo and backlog are not_started", () => {
    expect(mapTaskStatus(task("t", { status: "todo" }), NOW)).toBe("not_started");
    expect(mapTaskStatus(task("t", { status: "backlog" }), NOW)).toBe("not_started");
  });
});

describe("buildSxDataset", () => {
  const ds = buildSxDataset(
    {
      users: [user("u1", { department: "Product", role: "admin" }), user("u2")],
      projects: [project("p1"), project("p2", { status: "on_hold" })],
      tasks: [
        task("t1", { status: "done", projectId: "p1" }),
        task("t2", { blocked: true, blockerNote: "Waiting on legal", priority: "urgent", assigneeId: "u2" }),
        task("t3", { priority: "low", projectId: "p2" }),
      ],
      notifications: [notification],
    },
    NOW,
  );

  it("maps employees with team, role label and cycling avatar class", () => {
    expect(ds.employees[0]).toMatchObject({ id: "u1", team: "Product", role: "Admin", avatar: "avatar-1" });
    expect(ds.employees[1].avatar).toBe("avatar-2");
  });

  it("assigns template palette colours to projects", () => {
    expect(ds.projects.map((p) => p.color)).toEqual(["#7b2ff2", "#9e83f5"]);
  });

  it("maps tasks to template statuses and priorities", () => {
    const byId = Object.fromEntries(ds.tasks.map((t) => [t.id, t]));
    expect(byId.t1.status).toBe("completed");
    expect(byId.t2).toMatchObject({ status: "blocked", priority: "high", deadline: "2026-10-20" });
    expect(byId.t3.priority).toBe("low");
  });

  it("creates open blockers from blocked tasks", () => {
    expect(ds.blockers).toHaveLength(1);
    expect(ds.blockers[0]).toMatchObject({
      taskId: "t2",
      issue: "Waiting on legal",
      severity: "high",
      employeeId: "u2",
      status: "open",
      daysBlocked: 5,
    });
    expect(ds.blockers[0].actionRequired).toBe("Escalate");
  });

  it("derives per-project health and task counts", () => {
    const p1 = ds.projectHealth.find((p) => p.projectId === "p1");
    const p2 = ds.projectHealth.find((p) => p.projectId === "p2");
    expect(p1).toMatchObject({ tasksDone: 1, tasksTotal: 2, progress: 50, deadline: "2026-11-01" });
    expect(p2?.health).toBe("blocked");
  });

  it("maps notifications with a type colour", () => {
    expect(ds.notifications[0]).toMatchObject({ title: "Task overdue", message: "Something is late" });
    expect(ds.notifications[0].color).toMatch(/^#/);
  });
});

describe("filters", () => {
  const ds: SxDataset = {
    employees: [
      { id: "e1", name: "An Nguyen", initials: "AN", role: "Member", team: "Product", avatar: "avatar-1" },
      { id: "e2", name: "Binh Tran", initials: "BT", role: "Member", team: "Marketing", avatar: "avatar-2" },
    ],
    projects: [
      { id: "p1", name: "Alpha", color: "#7b2ff2" },
      { id: "p2", name: "Beta", color: "#9e83f5" },
    ],
    tasks: [
      { id: "t1", title: "Design hero", employeeId: "e1", projectId: "p1", priority: "high", status: "in_progress", progress: 10, deadline: "2026-10-07", notes: "" },
      { id: "t2", title: "Write copy", employeeId: "e2", projectId: "p2", priority: "low", status: "completed", progress: 100, deadline: "2026-12-20", notes: "" },
    ],
    blockers: [
      { id: "b1", taskId: "t1", issue: "x", severity: "high", daysBlocked: 1, actionRequired: "Approve", taskTitle: "Design hero", employeeId: "e1", projectId: "p1", status: "open" },
      { id: "b2", taskId: "t2", issue: "y", severity: "medium", daysBlocked: 2, actionRequired: "Assign", taskTitle: "Write copy", employeeId: "e2", projectId: "p2", status: "open" },
    ],
    projectHealth: [],
    notifications: [],
  };
  const now = new Date("2026-10-06T10:00:00");

  it("returns everything with default filters", () => {
    expect(filterTasks(ds, ALL, now)).toHaveLength(2);
  });
  it("filters by search across title, employee, project", () => {
    expect(filterTasks(ds, { ...ALL, search: "binh" }, now).map((t) => t.id)).toEqual(["t2"]);
    expect(filterTasks(ds, { ...ALL, search: "alpha" }, now).map((t) => t.id)).toEqual(["t1"]);
  });
  it("filters by team and project name", () => {
    expect(filterTasks(ds, { ...ALL, team: "Marketing" }, now).map((t) => t.id)).toEqual(["t2"]);
    expect(filterTasks(ds, { ...ALL, project: "Alpha" }, now).map((t) => t.id)).toEqual(["t1"]);
  });
  it("filters by period on deadline", () => {
    expect(filterTasks(ds, { ...ALL, period: "week" }, now).map((t) => t.id)).toEqual(["t1"]);
    expect(filterTasks(ds, { ...ALL, period: "year" }, now)).toHaveLength(2);
  });
  it("filters blockers by team and project", () => {
    expect(filterBlockers(ds, { ...ALL, team: "Product" }).map((b) => b.id)).toEqual(["b1"]);
    expect(filterBlockers(ds, { ...ALL, project: "Beta" }).map((b) => b.id)).toEqual(["b2"]);
  });
});

describe("kpis and health", () => {
  const mk = (status: SxTask["status"]): SxTask => ({
    id: status, title: status, employeeId: "e", projectId: "p", priority: "low", status, progress: 0, deadline: "2026-10-10", notes: "",
  });
  const tasks = [mk("completed"), mk("completed"), mk("in_progress"), mk("overdue"), mk("blocked"), mk("not_started")];

  it("counts each status", () => {
    expect(calcKpis(tasks)).toEqual({ total: 6, completed: 2, inProgress: 1, overdue: 1, blocked: 1, notStarted: 1 });
  });
  it("formats percent with one decimal like the template", () => {
    expect(percentOf(2, 6)).toBe("33.3%");
    expect(percentOf(1, 0)).toBe("0%");
  });
  it("summarises health score and bar percentages", () => {
    expect(healthSummary(calcKpis(tasks))).toEqual({ score: 50, onTrack: 50, atRisk: 17, blocked: 17 });
    expect(healthSummary(calcKpis([]))).toEqual({ score: 0, onTrack: 0, atRisk: 0, blocked: 0 });
  });
});

describe("risk and deadline labels", () => {
  const now = new Date("2026-10-06T10:00:00");
  const base: SxTask = { id: "t", title: "t", employeeId: "e", projectId: "p", priority: "low", status: "in_progress", progress: 50, deadline: "2026-12-01", notes: "" };

  it("scores and labels risk", () => {
    expect(riskLabel({ ...base, status: "overdue", priority: "high", deadline: "2026-10-01" }, now).label).toBe("CRITICAL");
    expect(riskLabel({ ...base, status: "blocked" }, now).label).toBe("HIGH");
    expect(riskLabel({ ...base, priority: "high" }, now).label).toBe("MEDIUM");
    expect(riskLabel(base, now)).toEqual({ label: "LOW", cls: "risk-low" });
    expect(riskScore({ ...base, progress: 10 }, now)).toBe(20);
  });

  it("labels deadlines relative to today", () => {
    expect(daysLabel({ ...base, deadline: "2026-10-04" }, now)).toEqual({ text: "2d trễ", cls: "deadline-urgent" });
    expect(daysLabel({ ...base, deadline: "2026-10-06" }, now).text).toBe("Hôm nay");
    expect(daysLabel({ ...base, deadline: "2026-10-07" }, now).text).toBe("Ngày mai");
    expect(daysLabel({ ...base, deadline: "2026-10-09" }, now)).toEqual({ text: "+3 ngày", cls: "" });
    expect(daysLabel({ ...base, deadline: "2026-12-01" }, now).text).toBe("01/12/2026");
    expect(daysLabel({ ...base, deadline: "" }, now).text).toBe("—");
  });

  it("formats dates the Vietnamese way", () => {
    expect(formatDeadline("2026-03-09")).toBe("09/03/2026");
    expect(formatDeadline("")).toBe("—");
    expect(vnDateLabel(new Date("2026-10-02T09:00:00"))).toBe("Thứ Sáu, 02 Tháng 10 2026");
  });
});
