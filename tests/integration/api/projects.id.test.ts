// tests/integration/api/projects.id.test.ts
// Integration tests for GET /api/projects/[id].

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn(),
}));
vi.mock("@/lib/db/projects", () => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

import { requireUser } from "@/lib/auth/session";
import { getProject } from "@/lib/db/projects";
import { GET } from "@/app/api/projects/[id]/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const GETHandler = GET as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(getProject).mockReset();
  });

  it("returns 401 when requireUser throws", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      const err = new Error("redirect") as Error & { digest?: string };
      err.digest = "NEXT_REDIRECT;replace;/login;307";
      throw err;
    });

    const response = await callRoute(GETHandler, { params: { id: "p1" } });
    expect(response.status).toBe(401);
  });

  it("returns 200 + the project when found", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(getProject).mockResolvedValue({
      id: "p1",
      name: "Phase E",
    } as never);

    const response = await callRoute(GETHandler, { params: { id: "p1" } });
    expect(response.status).toBe(200);
    const body = response.json as { id: string; name: string };
    expect(body.id).toBe("p1");
    expect(body.name).toBe("Phase E");
    expect(getProject).toHaveBeenCalledWith("p1");
  });

  it("returns 404 when getProject returns null", async () => {
    vi.mocked(requireUser).mockResolvedValue(SESSION);
    vi.mocked(getProject).mockResolvedValue(null);

    const response = await callRoute(GETHandler, { params: { id: "missing" } });
    expect(response.status).toBe(404);
    expect(response.json).toEqual({ error: "Not found" });
  });
});
