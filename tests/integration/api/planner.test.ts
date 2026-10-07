// tests/integration/api/planner.test.ts
// Integration tests for the /api/planner/* route handlers and the shared
// plannerErrorResponse mapper. Graph/token modules are mocked.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth/role", () => ({ getUserRole: vi.fn() }));
vi.mock("@/lib/planner/token", () => ({ getGraphToken: vi.fn(), readTokenRoles: vi.fn() }));
vi.mock("@/lib/planner/planner-api", () => ({
  listAllPlans: vi.fn(),
  listGroupPlans: vi.fn(),
  listPlanTasks: vi.fn(),
  listPlanBuckets: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock("@/lib/planner/planner-dataset", () => ({ invalidatePlannerSource: vi.fn() }));

import { requireUser } from "@/lib/auth/session";
import { getUserRole } from "@/lib/auth/role";
import { getGraphToken, readTokenRoles } from "@/lib/planner/token";
import { listAllPlans, listGroupPlans, listPlanBuckets, listPlanTasks, updateTask } from "@/lib/planner/planner-api";
import { invalidatePlannerSource } from "@/lib/planner/planner-dataset";
import { GraphError, PlannerInputError, TokenError } from "@/lib/planner/errors";
import { plannerErrorResponse } from "@/lib/planner/route-errors";
import { GET as statusGET } from "@/app/api/planner/status/route";
import { GET as plansGET } from "@/app/api/planner/plans/route";
import { GET as tasksGET } from "@/app/api/planner/plans/[planId]/tasks/route";
import { PATCH as taskPATCH } from "@/app/api/planner/tasks/[taskId]/route";
import { callRoute, type RouteHandlerFn } from "../_helpers/call-route";

const SESSION = { userId: "u1", email: "a@b.c", fullName: "A" };
const CLIENT_ID = "11111111-2222-3333-4444-555555555555";

function setEnv(secret = "abc~secret") {
  vi.stubEnv("MS_TENANT_ID", "tenant");
  vi.stubEnv("MS_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("MS_CLIENT_SECRET", secret);
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue(SESSION);
  vi.mocked(getUserRole).mockResolvedValue("manager");
});

describe("GET /api/planner/status", () => {
  const handler = statusGET as unknown as RouteHandlerFn;

  it("reports not configured without calling Microsoft", async () => {
    vi.stubEnv("MS_TENANT_ID", "");
    const res = await callRoute(handler);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ configured: false, connected: false });
    expect(getGraphToken).not.toHaveBeenCalled();
  });

  it("reports read/write capability from token roles", async () => {
    setEnv();
    vi.mocked(getGraphToken).mockResolvedValue("tok");
    vi.mocked(readTokenRoles).mockReturnValue(["Tasks.ReadWrite.All"]);
    const res = await callRoute(handler);
    expect(res.json).toMatchObject({ configured: true, connected: true, canRead: true, canWrite: true });
  });

  it("flags missing admin consent", async () => {
    setEnv();
    vi.mocked(getGraphToken).mockResolvedValue("tok");
    vi.mocked(readTokenRoles).mockReturnValue([]);
    const res = await callRoute(handler);
    expect(res.json).toMatchObject({ connected: true, canRead: false, canWrite: false });
    expect((res.json as { message: string }).message).toMatch(/admin consent/);
  });

  it("returns 502 when the token request fails", async () => {
    setEnv();
    vi.mocked(getGraphToken).mockRejectedValue(new TokenError("bad secret", "AADSTS7000215"));
    const res = await callRoute(handler);
    expect(res.status).toBe(502);
    expect(res.json).toMatchObject({ code: "AADSTS7000215" });
  });
});

describe("GET /api/planner/plans", () => {
  const handler = plansGET as unknown as RouteHandlerFn;

  it("lists plans from every group when no group is given", async () => {
    vi.stubEnv("PLANNER_GROUP_ID", "");
    const all = [{ id: "p1", title: "Plan", groupId: "g1", groupName: "Tech" }];
    vi.mocked(listAllPlans).mockResolvedValue(all);
    const res = await callRoute(handler);
    expect(res.status).toBe(200);
    expect(res.json).toEqual(all);
    expect(listGroupPlans).not.toHaveBeenCalled();
  });

  it("maps all-groups failures through the shared error mapper", async () => {
    vi.stubEnv("PLANNER_GROUP_ID", "");
    vi.mocked(listAllPlans).mockRejectedValue(new GraphError("denied", 403, "Forbidden"));
    const res = await callRoute(handler);
    expect(res.status).toBe(403);
  });

  it("uses the query param", async () => {
    vi.mocked(listGroupPlans).mockResolvedValue([{ id: "p1", title: "Plan" }]);
    const res = await callRoute(handler, { url: "http://localhost/api/planner/plans?groupId=g1" });
    expect(res.status).toBe(200);
    expect(res.json).toEqual([{ id: "p1", title: "Plan" }]);
    expect(listGroupPlans).toHaveBeenCalledWith("g1");
  });

  it("falls back to PLANNER_GROUP_ID", async () => {
    vi.stubEnv("PLANNER_GROUP_ID", "g-env");
    vi.mocked(listGroupPlans).mockResolvedValue([]);
    await callRoute(handler);
    expect(listGroupPlans).toHaveBeenCalledWith("g-env");
  });

  it("maps Graph 403 to a consent hint", async () => {
    vi.mocked(listGroupPlans).mockRejectedValue(new GraphError("denied", 403, "Forbidden"));
    const res = await callRoute(handler, { url: "http://localhost/x?groupId=g1" });
    expect(res.status).toBe(403);
    expect((res.json as { error: string }).error).toMatch(/admin consent/);
  });
});

describe("GET /api/planner/plans/:planId/tasks", () => {
  const handler = tasksGET as unknown as RouteHandlerFn;

  it("returns buckets and tasks", async () => {
    vi.mocked(listPlanTasks).mockResolvedValue([{ id: "t1" }] as never);
    vi.mocked(listPlanBuckets).mockResolvedValue([{ id: "b1" }] as never);
    const res = await callRoute(handler, { params: { planId: "plan_1" } });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ planId: "plan_1", buckets: [{ id: "b1" }], tasks: [{ id: "t1" }] });
  });

  it("maps invalid ids to 400", async () => {
    vi.mocked(listPlanTasks).mockRejectedValue(new PlannerInputError("Invalid planId"));
    vi.mocked(listPlanBuckets).mockResolvedValue([]);
    const res = await callRoute(handler, { params: { planId: "x" } });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/planner/tasks/:taskId", () => {
  const handler = taskPATCH as unknown as RouteHandlerFn;
  const updated = {
    id: "t1",
    planId: "plan_1",
    bucketId: null,
    title: "Ship",
    percentComplete: 100,
    priority: 3,
    startDateTime: null,
    dueDateTime: null,
    createdDateTime: "2026-10-01T00:00:00Z",
    completedDateTime: "2026-10-07T00:00:00Z",
    assignments: {},
    "@odata.etag": 'W/"2"',
  };

  function patch(body: unknown) {
    return callRoute(handler, { method: "PATCH", params: { taskId: "t1" }, body });
  }

  it("writes to Planner, invalidates the cache and returns the mapped task + new etag", async () => {
    vi.mocked(updateTask).mockResolvedValue(updated);
    const res = await patch({ etag: 'W/"1"', patch: { percentComplete: 100 } });
    expect(res.status).toBe(200);
    expect(updateTask).toHaveBeenCalledWith("t1", 'W/"1"', { percentComplete: 100 });
    expect(invalidatePlannerSource).toHaveBeenCalledTimes(1);
    expect(res.json).toMatchObject({
      etag: 'W/"2"',
      task: { id: "t1", projectId: "plan_1", status: "completed", progress: 100, priority: "high" },
    });
  });

  it.each([
    ["missing etag", { patch: { percentComplete: 0 } }],
    ["non-object body", "nope"],
    ["missing patch", { etag: 'W/"1"' }],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await patch(body);
    expect(res.status).toBe(400);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("maps a stale etag (412) to 409 and keeps the cache", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateTask).mockRejectedValue(new GraphError("etag", 412, "PreconditionFailed"));
    const res = await patch({ etag: 'W/"old"', patch: { priority: 3 } });
    expect(res.status).toBe(409);
    expect(invalidatePlannerSource).not.toHaveBeenCalled();
  });

  it("maps invalid patches to 400", async () => {
    vi.mocked(updateTask).mockRejectedValue(new PlannerInputError("Patch must change at least one field"));
    const res = await patch({ etag: 'W/"1"', patch: {} });
    expect(res.status).toBe(400);
  });

  it.each(["owner", "admin", "manager"] as const)("lets a %s edit", async (role) => {
    vi.mocked(getUserRole).mockResolvedValue(role);
    vi.mocked(updateTask).mockResolvedValue(updated);
    const res = await patch({ etag: 'W/"1"', patch: { percentComplete: 100 } });
    expect(res.status).toBe(200);
    expect(getUserRole).toHaveBeenCalledWith("u1");
  });

  it.each([["member"], ["viewer"], [null]] as const)("rejects role %s with 403 without calling Planner", async (role) => {
    vi.mocked(getUserRole).mockResolvedValue(role);
    const res = await patch({ etag: 'W/"1"', patch: { percentComplete: 100 } });
    expect(res.status).toBe(403);
    expect(res.json).toMatchObject({ code: "forbidden" });
    expect(updateTask).not.toHaveBeenCalled();
  });
});

describe("plannerErrorResponse", () => {
  it.each([
    [new GraphError("gone", 404, "NotFound"), 404],
    [new GraphError("etag", 412, "PreconditionFailed"), 409],
    [new GraphError("down", 500, "Internal"), 502],
    [new GraphError("auth", 401, "InvalidAuthenticationToken"), 403],
    [new Error("weird"), 500],
    ["string-thrown", 500],
  ])("maps %s → %i", async (err, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(plannerErrorResponse(err, "test").status).toBe(status);
  });

  it("maps config errors to 503", async () => {
    const { PlannerConfigError } = await import("@/lib/planner/errors");
    const res = plannerErrorResponse(new PlannerConfigError("missing"), "test");
    expect(res.status).toBe(503);
  });
});
