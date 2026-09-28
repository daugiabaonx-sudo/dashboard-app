// tests/integration/api/stats.workload.test.ts
// Integration tests for GET /api/stats/workload.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn(),
}));
vi.mock("@/lib/db/stats", () => ({
  getKpis: vi.fn(),
  getTeamWorkload: vi.fn(),
}));

import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { getTeamWorkload } from "@/lib/db/stats";
import { GET } from "@/app/api/stats/workload/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const GETHandler = GET as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

describe("GET /api/stats/workload", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(getCurrentWorkspaceId).mockReset();
    vi.mocked(getTeamWorkload).mockReset();
  });

  it("returns 200 + workload rows scoped to the current workspace", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(getCurrentWorkspaceId).mockResolvedValue("ws_42");
    vi.mocked(getTeamWorkload).mockResolvedValue([
      {
        userId: "u1",
        assignedTasks: 4,
        completedTasks: 2,
        overdueTasks: 1,
        utilization: 88,
      },
    ]);

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(200);
    expect(response.json).toEqual([
      {
        userId: "u1",
        assignedTasks: 4,
        completedTasks: 2,
        overdueTasks: 1,
        utilization: 88,
      },
    ]);
    expect(getTeamWorkload).toHaveBeenCalledWith("ws_42");
  });

  it("returns 500 when getTeamWorkload throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(getCurrentWorkspaceId).mockResolvedValue("ws_42");
    vi.mocked(getTeamWorkload).mockRejectedValue(new Error("rpc failed"));

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "rpc failed" });
  });
});
