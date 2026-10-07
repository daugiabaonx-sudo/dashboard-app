// tests/unit/planner/graph-planner.test.ts
// Unit tests for lib/planner/graph-client.ts and lib/planner/planner-api.ts.
// The token module is mocked; global fetch is stubbed per test.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/planner/token", () => ({ getGraphToken: vi.fn(async () => "tok") }));

import { GraphError, PlannerInputError } from "@/lib/planner/errors";
import { GRAPH_BASE, graphList, graphRequest } from "@/lib/planner/graph-client";
import {
  createTask,
  deleteTask,
  getPlan,
  getTask,
  getUsersByIds,
  listAllPlans,
  listGroupPlans,
  listPlanBuckets,
  listPlanTasks,
  updateTask,
} from "@/lib/planner/planner-api";

const GROUP = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const fetchMock = vi.fn();

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function lastCall(): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("graphRequest", () => {
  it("sends bearer auth and returns data + etag from the body", async () => {
    fetchMock.mockResolvedValue(json({ id: "p1", "@odata.etag": 'W/"1"' }));
    const res = await graphRequest<{ id: string }>("/planner/plans/p1");
    expect(res).toEqual({ data: { id: "p1", "@odata.etag": 'W/"1"' }, etag: 'W/"1"' });
    const { url, headers } = lastCall();
    expect(url).toBe(`${GRAPH_BASE}/planner/plans/p1`);
    expect(headers.get("authorization")).toBe("Bearer tok");
    expect(headers.has("content-type")).toBe(false);
  });

  it("prefers the ETag header and handles 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204, headers: { etag: 'W/"9"' } }));
    expect(await graphRequest("/x", { method: "DELETE", ifMatch: 'W/"8"' })).toEqual({
      data: undefined,
      etag: 'W/"9"',
    });
    expect(lastCall().headers.get("if-match")).toBe('W/"8"');
  });

  it("returns a null etag when none is present", async () => {
    fetchMock.mockResolvedValue(json({ ok: 1 }));
    expect((await graphRequest("/x")).etag).toBeNull();
  });

  it("retries 429 using Retry-After then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 429, { "retry-after": "0.001" }))
      .mockResolvedValueOnce(json({ ok: true }));
    expect((await graphRequest("/x")).data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry budget and throws GraphError", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json({ error: { code: "TooMany", message: "slow down" } }, 503));
    const pending = graphRequest("/x").catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await pending;
    vi.useRealTimers();
    expect(err).toBeInstanceOf(GraphError);
    expect(err).toMatchObject({ status: 503, code: "TooMany", message: "slow down" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("builds a generic error when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 403 }));
    await expect(graphRequest("/x")).rejects.toMatchObject({ status: 403, code: "unknown" });
  });

  it("refuses non-Graph absolute URLs", async () => {
    await expect(graphRequest("https://evil.example.com/v1.0/x")).rejects.toMatchObject({
      code: "invalid_url",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("graphList", () => {
  it("follows @odata.nextLink", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ value: [1, 2], "@odata.nextLink": `${GRAPH_BASE}/x?page=2` }))
      .mockResolvedValueOnce(json({ value: [3] }));
    expect(await graphList<number>("/x")).toEqual([1, 2, 3]);
    expect(lastCall().url).toBe(`${GRAPH_BASE}/x?page=2`);
  });
});

describe("planner-api reads", () => {
  it("hits the documented endpoints", async () => {
    fetchMock.mockImplementation(async () => json({ value: [], id: "z" }));
    await listGroupPlans(GROUP);
    expect(lastCall().url).toBe(`${GRAPH_BASE}/groups/${GROUP}/planner/plans`);
    await listPlanTasks("plan_1");
    expect(lastCall().url).toBe(`${GRAPH_BASE}/planner/plans/plan_1/tasks`);
    await listPlanBuckets("plan_1");
    expect(lastCall().url).toBe(`${GRAPH_BASE}/planner/plans/plan_1/buckets`);
    expect(await getPlan("plan_1")).toMatchObject({ id: "z" });
    expect(await getTask("task-1")).toMatchObject({ id: "z" });
    expect(lastCall().url).toBe(`${GRAPH_BASE}/planner/tasks/task-1`);
  });

  it("rejects ids that could alter the URL path", async () => {
    await expect(getTask("../users")).rejects.toBeInstanceOf(PlannerInputError);
    expect(() => listPlanTasks("a/b")).toThrow(PlannerInputError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("listAllPlans", () => {
  const G1 = "11111111-1111-1111-1111-111111111111";
  const G2 = "22222222-2222-2222-2222-222222222222";
  const G3 = "33333333-3333-3333-3333-333333333333";

  function routeByUrl(byGroup: Record<string, Response>) {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/groups?")) {
        return json({
          value: [
            { id: G1, displayName: "Tech" },
            { id: G2, displayName: "Sales" },
            { id: G3, displayName: "Marketing" },
          ],
        });
      }
      const hit = Object.keys(byGroup).find((g) => url.includes(`/groups/${g}/planner/plans`));
      return hit ? byGroup[hit].clone() : json({ value: [] });
    });
  }

  it("queries only Microsoft 365 (Unified) groups", async () => {
    routeByUrl({});
    await listAllPlans();
    const groupsUrl = fetchMock.mock.calls.map(([u]) => u as string).find((u) => u.includes("/groups?"));
    expect(decodeURIComponent(groupsUrl ?? "")).toContain("groupTypes/any(c:c eq 'Unified')");
  });

  it("returns every plan tagged with its group, skipping groups without plans", async () => {
    routeByUrl({
      [G1]: json({ value: [{ id: "p1", title: "Dev" }, { id: "p2", title: "Ops" }] }),
      [G3]: json({ value: [{ id: "p3", title: "Campaign" }] }),
    });
    expect(await listAllPlans()).toEqual([
      { id: "p1", title: "Dev", groupId: G1, groupName: "Tech" },
      { id: "p2", title: "Ops", groupId: G1, groupName: "Tech" },
      { id: "p3", title: "Campaign", groupId: G3, groupName: "Marketing" },
    ]);
  });

  it("skips groups whose Planner is forbidden or missing", async () => {
    routeByUrl({
      [G1]: json({ error: { code: "Forbidden", message: "no" } }, 403),
      [G2]: json({ error: { code: "NotFound", message: "no" } }, 404),
      [G3]: json({ value: [{ id: "p3", title: "Campaign" }] }),
    });
    expect((await listAllPlans()).map((p) => p.id)).toEqual(["p3"]);
  });

  it("propagates other Graph failures", async () => {
    routeByUrl({ [G2]: json({ error: { code: "BadRequest", message: "bad" } }, 400) });
    await expect(listAllPlans()).rejects.toMatchObject({ status: 400, code: "BadRequest" });
  });
});

describe("planner-api writes", () => {
  it("createTask builds assignments for assignees", async () => {
    fetchMock.mockResolvedValue(json({ id: "t1" }, 201));
    await createTask({ planId: "plan_1", title: " Ship ", assigneeIds: [GROUP] });
    const body = JSON.parse(lastCall().init.body as string);
    expect(body).toEqual({
      planId: "plan_1",
      title: "Ship",
      assignments: { [GROUP]: { "@odata.type": "#microsoft.graph.plannerAssignment", orderHint: " !" } },
    });
    expect(lastCall().init.method).toBe("POST");
  });

  it("createTask omits assignments when none are given", async () => {
    fetchMock.mockResolvedValue(json({ id: "t2" }, 201));
    await createTask({ planId: "plan_1", title: "Solo", percentComplete: 50 });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      planId: "plan_1",
      title: "Solo",
      percentComplete: 50,
    });
  });

  it("createTask validates input", async () => {
    await expect(createTask({ planId: "plan_1", title: "" })).rejects.toBeInstanceOf(PlannerInputError);
  });

  it("updateTask sends If-Match + Prefer and returns the entity", async () => {
    fetchMock.mockResolvedValue(json({ id: "t1", percentComplete: 100 }));
    const task = await updateTask("t1", 'W/"3"', { percentComplete: 100 });
    expect(task.percentComplete).toBe(100);
    const { headers, init } = lastCall();
    expect(init.method).toBe("PATCH");
    expect(headers.get("if-match")).toBe('W/"3"');
    expect(headers.get("prefer")).toBe("return=representation");
  });

  it("updateTask rejects empty patches and missing etags", async () => {
    await expect(updateTask("t1", 'W/"3"', {})).rejects.toBeInstanceOf(PlannerInputError);
    await expect(updateTask("t1", "", { title: "x" })).rejects.toThrow(/ETag/);
  });

  it("deleteTask sends DELETE with If-Match", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteTask("t1", 'W/"4"');
    expect(lastCall().init.method).toBe("DELETE");
    expect(lastCall().headers.get("if-match")).toBe('W/"4"');
  });
});

describe("getUsersByIds", () => {
  const U1 = "11111111-1111-1111-1111-111111111111";
  const U2 = "22222222-2222-2222-2222-222222222222";

  it("posts ids to directoryObjects/getByIds and maps user fields", async () => {
    fetchMock.mockResolvedValue(
      json({ value: [{ id: U1, displayName: "Lan", jobTitle: "Dev", department: "Tech", mail: "x" }] }),
    );
    const users = await getUsersByIds([U1]);
    expect(users).toEqual([{ id: U1, displayName: "Lan", jobTitle: "Dev", department: "Tech" }]);
    const { url, init } = lastCall();
    expect(url).toBe(`${GRAPH_BASE}/directoryObjects/getByIds`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ ids: [U1], types: ["user"] });
  });

  it("does not call Graph for an empty list and skips invalid ids", async () => {
    expect(await getUsersByIds([])).toEqual([]);
    expect(await getUsersByIds(["../etc", "bad id"])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates ids", async () => {
    fetchMock.mockResolvedValue(json({ value: [] }));
    await getUsersByIds([U1, U2, U1]);
    expect(JSON.parse(String(lastCall().init.body)).ids).toEqual([U1, U2]);
  });
});
