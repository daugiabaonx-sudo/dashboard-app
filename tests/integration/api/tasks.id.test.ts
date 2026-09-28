// tests/integration/api/tasks.id.test.ts
// Integration tests for DELETE /api/tasks/[id].

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn(),
}));
vi.mock("@/lib/db/tasks", () => ({
  deleteTask: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { deleteTask } from "@/lib/db/tasks";
import { DELETE } from "@/app/api/tasks/[id]/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const DELETEHandler = DELETE as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

describe("DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(deleteTask).mockReset();
  });

  it("returns 401 when no session", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      const err = new Error("redirect") as Error & { digest?: string };
      err.digest = "NEXT_REDIRECT;replace;/login;307";
      throw err;
    });

    const response = await callRoute(DELETEHandler, {
      method: "DELETE",
      params: { id: "t1" },
    });
    expect(response.status).toBe(401);
  });

  it("returns 200 + {ok: true} on success", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(deleteTask).mockResolvedValue(undefined);

    const response = await callRoute(DELETEHandler, {
      method: "DELETE",
      params: { id: "t1" },
    });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ ok: true });
    expect(deleteTask).toHaveBeenCalledWith("t1");
  });

  it("returns 500 when deleteTask throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(deleteTask).mockRejectedValue(new Error("fk violation"));

    const response = await callRoute(DELETEHandler, {
      method: "DELETE",
      params: { id: "t1" },
    });
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "fk violation" });
  });
});
