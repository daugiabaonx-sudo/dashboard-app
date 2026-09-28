// tests/integration/api/tasks.id.status.test.ts
// Integration tests for PATCH /api/tasks/[id]/status.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));
vi.mock("@/lib/db/tasks", () => ({
  setTaskStatus: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { setTaskStatus } from "@/lib/db/tasks";
import { PATCH } from "@/app/api/tasks/[id]/status/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const PATCHHandler = PATCH as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

describe("PATCH /api/tasks/[id]/status", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(setTaskStatus).mockReset();
  });

  it("returns 401 when no session", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      const err = new Error("redirect") as Error & { digest?: string };
      err.digest = "NEXT_REDIRECT;replace;/login;307";
      throw err;
    });

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: "t1" },
      body: { status: "done" },
    });
    expect(response.status).toBe(401);
  });

  it("returns 200 + updated task on success", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(setTaskStatus).mockResolvedValue({
      id: "t1",
      title: "Wire up",
      status: "done",
    } as never);

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: "t1" },
      body: { status: "done" },
    });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ id: "t1", title: "Wire up", status: "done" });
    expect(setTaskStatus).toHaveBeenCalledWith("t1", "done");
  });

  it("returns 400 on invalid JSON body", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: "t1" },
      headers: { "content-type": "application/json" },
      body: "nope{",
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 on schema validation failure (invalid status)", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: "t1" },
      body: { status: "archived" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 500 when setTaskStatus throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(setTaskStatus).mockRejectedValue(new Error("no row returned"));

    const response = await callRoute(PATCHHandler, {
      method: "PATCH",
      params: { id: "t1" },
      body: { status: "in_progress" },
    });
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "no row returned" });
  });
});
