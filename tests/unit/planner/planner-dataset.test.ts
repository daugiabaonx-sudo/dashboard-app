// tests/unit/planner/planner-dataset.test.ts
// Server loader that assembles every plan, task and member into a cached
// PlannerSource (lib/planner/planner-dataset.ts). planner-api is mocked.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/planner/config", () => ({
  readPlannerConfig: vi.fn(() => ({ tenantId: "tid", clientId: "c", clientSecret: "s" })),
}));
vi.mock("@/lib/planner/planner-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/planner/planner-api")>()),
  listAllPlans: vi.fn(),
  listPlanTasks: vi.fn(),
  listGroupMembers: vi.fn(),
}));

import { GraphError } from "@/lib/planner/errors";
import { listAllPlans, listGroupMembers, listPlanTasks } from "@/lib/planner/planner-api";
import {
  invalidatePlannerSource,
  loadPlannerDataset,
  loadPlannerSource,
} from "@/lib/planner/planner-dataset";

const PLANS = [
  { id: "p1", title: "Dev", groupId: "g1", groupName: "Tech" },
  { id: "p2", title: "Ops", groupId: "g1", groupName: "Tech" },
  { id: "p3", title: "Ads", groupId: "g2", groupName: "Marketing" },
];

function plannerTask(id: string, planId: string) {
  return {
    id,
    planId,
    bucketId: null,
    title: id,
    percentComplete: 0,
    priority: 5,
    startDateTime: null,
    dueDateTime: null,
    createdDateTime: "2026-10-01T00:00:00Z",
    completedDateTime: null,
    assignments: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidatePlannerSource();
  vi.mocked(listAllPlans).mockResolvedValue(PLANS);
  vi.mocked(listPlanTasks).mockImplementation(async (planId: string) => [plannerTask(`t-${planId}`, planId)]);
  vi.mocked(listGroupMembers).mockResolvedValue([{ id: "u1", displayName: "A", jobTitle: null, department: null }]);
});

describe("loadPlannerSource", () => {
  it("collects tasks of every plan and members of each distinct group once", async () => {
    const src = await loadPlannerSource();
    expect(src.tenantId).toBe("tid");
    expect(src.plans).toEqual(PLANS);
    expect(src.tasks.map((t) => t.id)).toEqual(["t-p1", "t-p2", "t-p3"]);
    expect(vi.mocked(listGroupMembers).mock.calls.map(([g]) => g)).toEqual(["g1", "g2"]);
    expect(Object.keys(src.members)).toEqual(["g1", "g2"]);
  });

  it("caches the result until invalidated, sharing one in-flight load", async () => {
    await Promise.all([loadPlannerSource(), loadPlannerSource()]);
    await loadPlannerSource();
    expect(listAllPlans).toHaveBeenCalledTimes(1);
    invalidatePlannerSource();
    await loadPlannerSource();
    expect(listAllPlans).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures", async () => {
    vi.mocked(listAllPlans).mockRejectedValueOnce(new GraphError("down", 503, "Unavailable"));
    await expect(loadPlannerSource()).rejects.toMatchObject({ status: 503 });
    await expect(loadPlannerSource()).resolves.toMatchObject({ tenantId: "tid" });
  });

  it("treats forbidden / missing member lists as empty", async () => {
    vi.mocked(listGroupMembers).mockRejectedValue(new GraphError("no", 403, "Forbidden"));
    const src = await loadPlannerSource();
    expect(src.members).toEqual({ g1: [], g2: [] });
  });

  it("propagates other task-loading failures", async () => {
    vi.mocked(listPlanTasks).mockRejectedValue(new GraphError("bad", 400, "BadRequest"));
    await expect(loadPlannerSource()).rejects.toMatchObject({ status: 400 });
  });
});

describe("loadPlannerDataset", () => {
  it("maps the cached source into a Planner dataset", async () => {
    const ds = await loadPlannerDataset();
    expect(ds.source).toBe("planner");
    expect(ds.projects.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(ds.tasks).toHaveLength(3);
  });
});
