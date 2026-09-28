// tests/integration/api/tasks.id.patch.test.ts
// Integration tests for PATCH /api/tasks/[id].
// Mirrors the validation/error-response shape established by
// `app/api/tasks/[id]/status/route.ts`. Cases below cover every meaningful
// branch of `updateTaskSchema = createTaskSchema.partial()`.
//
// Note: `updateTask` (lib/db/tasks.ts) currently sends every column whose
// parsed value is `undefined` along to Supabase as part of `.update({...})`.
// That predates this test and is a follow-up concern — these tests assert
// current behaviour, not desired PATCH semantics.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn(),
}));
vi.mock("@/lib/db/tasks", () => ({
  listTasks: vi.fn(),
  listTasksByProject: vi.fn(),
  listTasksByStatus: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  setTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { updateTask } from "@/lib/db/tasks";
import { PATCH } from "@/app/api/tasks/[id]/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const PATCHHandler = PATCH as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

const TASK_ID = "t1";

function throwNextRedirect(): Promise<never> {
  const err = new Error("redirect") as Error & { digest?: string };
  err.digest = "NEXT_REDIRECT;replace;/login;307";
  throw err;
}

describe("PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(updateTask).mockReset();
  });

  it("returns 401 when requireUser throws (no session)", async () => {
    vi.mocked(requireUser).mockImplementation(throwNextRedirect);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { title: "Renamed" },
    });
    expect(response.status).toBe(401);
    expect(response.redirected).toBe(true);
    expect(response.location).toBe("/login");
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("returns 200 + updated task on a minimal partial body (single field)", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateTask).mockResolvedValue({
      id: TASK_ID,
      title: "Renamed",
    } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { title: "Renamed" },
    });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ id: TASK_ID, title: "Renamed" });
    // updateTaskSchema.partial() preserves create-schema defaults, so the
    // payload includes defaulted fields alongside the supplied `title`.
    // Assert on supplied-key presence rather than full equality.
    expect(updateTask).toHaveBeenCalledTimes(1);
    const [, payload] = vi.mocked(updateTask).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.title).toBe("Renamed");
  });

  it("returns 200 with multi-field partial body — camelCase keys propagate", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateTask).mockResolvedValue({ id: TASK_ID } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: {
        priority: "low",
        tags: ["phase-f"],
        blocked: false,
      },
    });
    expect(response.status).toBe(200);
    const [, payload] = vi.mocked(updateTask).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.priority).toBe("low");
    expect(payload.tags).toEqual(["phase-f"]);
    expect(payload.blocked).toBe(false);
  });

  it("returns 200 + accepts null for nullable fields (assigneeId)", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateTask).mockResolvedValue({ id: TASK_ID } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { assigneeId: null },
    });
    expect(response.status).toBe(200);
    expect(updateTask).toHaveBeenCalledTimes(1);
    const [, payload] = vi.mocked(updateTask).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.assigneeId).toBeNull();
  });

  it("returns 200 on empty body — updateTaskSchema is .partial() so {} parses", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateTask).mockResolvedValue({ id: TASK_ID } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: {},
    });
    expect(response.status).toBe(200);
    expect(updateTask).toHaveBeenCalledTimes(1);
  });

  it("returns 400 on invalid JSON body", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      headers: { "content-type": "application/json" },
      body: "nope{",
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "Invalid JSON" });
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod issues on invalid status enum", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { status: "archived" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("returns 400 with Zod issues on invalid priority enum", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      // taskPrioritySchema = ["low","medium","high","urgent"]. "urgent" is
      // valid (status != priority); pick an out-of-set value to exercise the
      // validation failure branch.
      body: { priority: "highest" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 with Zod issues on invalid dueDate", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { dueDate: "garbage" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 with Zod issues on invalid reporterId UUID", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { reporterId: "not-a-uuid" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 with Zod issues on empty title (min(1))", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { title: "" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 with Zod issues on negative estimatedHours (min(0))", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { estimatedHours: -5 },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
  });

  it("returns 500 when updateTask throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateTask).mockRejectedValue(new Error("updateTask: rls blocked"));

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { title: "X" },
    });
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "updateTask: rls blocked" });
  });

  it("returns 500 with no-row-returned message when db returns empty array", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(updateTask).mockRejectedValue(
      new Error("updateTask: no row returned"),
    );

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: TASK_ID },
      body: { title: "X" },
    });
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "updateTask: no row returned" });
  });
});
