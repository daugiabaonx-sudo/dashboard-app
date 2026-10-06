import { describe, expect, it } from "vitest";
import { employeeCards, projectCards, sxVariantFor } from "@/lib/sx-views";
import type { SxDataset, SxTask } from "@/lib/sx-dashboard";

const task = (over: Partial<SxTask>): SxTask => ({
  id: "t",
  title: "T",
  employeeId: "e1",
  projectId: "p1",
  priority: "medium",
  status: "in_progress",
  progress: 0,
  deadline: "2026-10-10",
  notes: "",
  ...over,
});

const ds: SxDataset = {
  employees: [
    { id: "e1", name: "An", initials: "A", role: "Member", team: "Eng", avatar: "avatar-1" },
    { id: "e2", name: "Binh", initials: "B", role: "Manager", team: "Ops", avatar: "avatar-2" },
  ],
  projects: [
    { id: "p1", name: "Alpha", color: "#7b2ff2" },
    { id: "p2", name: "Beta", color: "#17c98b" },
  ],
  tasks: [
    task({ id: "t1", status: "completed", progress: 100 }),
    task({ id: "t2", status: "overdue", progress: 20 }),
    task({ id: "t3", status: "blocked", progress: 30 }),
    task({ id: "t4", status: "in_progress", progress: 50, employeeId: "e2", projectId: "p1" }),
  ],
  blockers: [],
  projectHealth: [],
  notifications: [],
};

describe("sxVariantFor", () => {
  it.each(["/", "/tasks", "/projects", "/team", "/notifications", "/settings", "/tasks/"])(
    "uses the template overview layout for %s",
    (path) => expect(sxVariantFor(path)).toBe("overview"),
  );

  it.each(["/reports", "/calendar", "/projects/p1", "/team/u1", "/unknown"])(
    "uses the scrollable page layout for %s",
    (path) => expect(sxVariantFor(path)).toBe("page"),
  );

  it("falls back to page for empty input", () => {
    expect(sxVariantFor("")).toBe("page");
  });
});

describe("projectCards", () => {
  it("aggregates done / total / pct / overdue / blocked per project", () => {
    const [alpha, beta] = projectCards(ds);
    expect(alpha).toMatchObject({ id: "p1", name: "Alpha", total: 4, done: 1, pct: 25, overdue: 1, blocked: 1 });
    expect(beta).toMatchObject({ id: "p2", total: 0, done: 0, pct: 0, overdue: 0, blocked: 0 });
  });

  it("uses the tasks passed in (with local edits) instead of dataset tasks", () => {
    const edited = ds.tasks.map((t) => ({ ...t, status: "completed" as const }));
    expect(projectCards(ds, edited)[0].pct).toBe(100);
  });
});

describe("employeeCards", () => {
  it("aggregates tasks / done / active / overdue / avg progress per employee", () => {
    const [an, binh] = employeeCards(ds);
    expect(an).toMatchObject({ id: "e1", tasks: 3, done: 1, active: 0, overdue: 1, avgProg: 50 });
    expect(binh).toMatchObject({ id: "e2", tasks: 1, done: 0, active: 1, overdue: 0, avgProg: 50 });
  });

  it("returns 0 average for employees without tasks", () => {
    const none = employeeCards({ ...ds, tasks: [] });
    expect(none.every((e) => e.tasks === 0 && e.avgProg === 0)).toBe(true);
  });
});
