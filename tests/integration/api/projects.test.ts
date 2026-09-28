// tests/integration/api/projects.test.ts
// Integration tests for GET + POST /api/projects.

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

import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { listProjects, createProject } from "@/lib/db/projects";
import { GET, POST } from "@/app/api/projects/route";
import type { RouteHandlerFn } from "../_helpers/call-route";
const GETHandler = GET as unknown as RouteHandlerFn;
const POSTHandler = POST as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};

const validProjectBody = {
  name: "New Project",
  description: "Phase E",
  ownerId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  startDate: "2026-01-01",
  dueDate: "2026-02-28",
  status: "planning",
  priority: "high",
};

describe("/api/projects", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(getCurrentWorkspaceId).mockReset();
    vi.mocked(listProjects).mockReset();
    vi.mocked(createProject).mockReset();
  });

  describe("GET", () => {
    it("returns 401 when requireUser throws (no session)", async () => {
      vi.mocked(requireUser).mockImplementation(() => {
        const err = new Error("redirect") as Error & { digest?: string };
        err.digest = "NEXT_REDIRECT;replace;/login;307";
        throw err;
      });

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(401);
      expect(response.redirected).toBe(true);
      expect(response.location).toBe("/login");
    });

    it("returns 200 + projects JSON on success", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listProjects).mockResolvedValue([
        { id: "p1", name: "Phase E" },
      ] as never);

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(200);
      expect(response.json).toEqual([{ id: "p1", name: "Phase E" }]);
    });

    it("returns 500 with error message when listProjects throws", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listProjects).mockRejectedValue(new Error("boom"));

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(500);
      expect(response.json).toEqual({ error: "boom" });
    });
  });

  describe("POST", () => {
    it("creates a project and returns 201 with the new project", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(getCurrentWorkspaceId).mockResolvedValue("ws_42");
      vi.mocked(createProject).mockResolvedValue({
        id: "p_new",
        name: "New Project",
      } as never);

      const response = await callRoute(POSTHandler, {
        method: "POST",
        body: validProjectBody,
      });

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ id: "p_new", name: "New Project" });
      expect(getCurrentWorkspaceId).toHaveBeenCalledTimes(1);
    });

    it("returns 400 when body is invalid JSON", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);

      const response = await callRoute(POSTHandler, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json{",
      });
      expect(response.status).toBe(400);
      expect(response.json).toEqual({ error: "Invalid JSON" });
    });

    it("returns 400 with Zod issues on schema validation failure", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);

      const response = await callRoute(POSTHandler, {
        method: "POST",
        body: { name: "" },
      });
      expect(response.status).toBe(400);
      const body = response.json as { error: string; issues: unknown };
      expect(body.error).toBe("Validation failed");
      expect(body.issues).toBeDefined();
    });

    it("returns 500 when createProject throws", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(getCurrentWorkspaceId).mockResolvedValue("ws_42");
      vi.mocked(createProject).mockRejectedValue(new Error("rls blocked"));

      const response = await callRoute(POSTHandler, {
        method: "POST",
        body: validProjectBody,
      });
      expect(response.status).toBe(500);
      expect(response.json).toEqual({ error: "rls blocked" });
    });
  });
});
