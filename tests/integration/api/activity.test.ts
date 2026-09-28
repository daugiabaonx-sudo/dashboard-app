// tests/integration/api/activity.test.ts
// Integration tests for GET /api/activity.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));
vi.mock("@/lib/db/activity", () => ({
  listRecentActivity: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { listRecentActivity } from "@/lib/db/activity";
import { GET } from "@/app/api/activity/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const GETHandler = GET as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

describe("GET /api/activity", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(listRecentActivity).mockReset();
  });

  it("returns 401 when no session", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      const err = new Error("redirect") as Error & { digest?: string };
      err.digest = "NEXT_REDIRECT;replace;/login;307";
      throw err;
    });

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(401);
  });

  it("returns 200 + the activity list and uses the default limit of 12", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(listRecentActivity).mockResolvedValue([
      { id: "act_1", message: "Marked done" },
    ] as never);

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(200);
    expect(response.json).toEqual([{ id: "act_1", message: "Marked done" }]);
    expect(listRecentActivity).toHaveBeenCalledWith(12);
  });

  it("returns 500 when listRecentActivity throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(listRecentActivity).mockRejectedValue(new Error("rls denied"));

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "rls denied" });
  });
});
