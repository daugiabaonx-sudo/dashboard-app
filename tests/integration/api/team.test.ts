// tests/integration/api/team.test.ts
// Integration tests for GET /api/team.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));
vi.mock("@/lib/db/profiles", () => ({
  listProfiles: vi.fn(),
  getProfile: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { listProfiles } from "@/lib/db/profiles";
import { GET } from "@/app/api/team/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const GETHandler = GET as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

describe("GET /api/team", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(listProfiles).mockReset();
  });

  it("returns 200 + the team profile list", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(listProfiles).mockResolvedValue([
      { id: "u1", email: "alice@example.com", name: "Alice" },
    ] as never);

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(200);
    expect(response.json).toEqual([
      { id: "u1", email: "alice@example.com", name: "Alice" },
    ]);
    expect(listProfiles).toHaveBeenCalledWith();
  });

  it("returns 500 when listProfiles throws", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(listProfiles).mockRejectedValue(new Error("rls denied"));

    const response = await callRoute(GETHandler);
    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: "rls denied" });
  });
});
