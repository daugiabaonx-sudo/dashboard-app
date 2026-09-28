// tests/integration/api/tasks.test.ts
// Integration tests for GET + POST /api/tasks.

import { beforeEach, describe, expect, it, vi } from "vitest";

// /api/tasks declares NextRequest for `request.nextUrl.searchParams`. The
// shared callRoute() helper passes a plain Request, which is structurally
// compatible at runtime but not in TS contravariance. Cast once here.
import type { RouteHandlerFn } from "../_helpers/call-route";

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

import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { listTasks, listTasksByStatus, createTask } from "@/lib/db/tasks";
import { GET, POST } from "@/app/api/tasks/route";

const GETHandler = GET as unknown as RouteHandlerFn;
const POSTHandler = POST as unknown as RouteHandlerFn;
import { callRoute } from "../_helpers/call-route";

const SESSION = {
  userId: "a1b2c3d4-e5f6-7890-abcd-00000000000a",
  email: "alice@example.com",
  fullName: "Alice",
};
const PROJECT_ID = "a1b2c3d4-e5f6-7890-abcd-000000000010";
const REPORTER_ID = SESSION.userId;

const validTaskBody = {
  projectId: PROJECT_ID,
  reporterId: REPORTER_ID,
  title: "Wire up dashboard",
  description: "Phase E",
  status: "in_progress",
  priority: "high",
  dueDate: "2026-02-28",
  estimatedHours: 12,
  tags: ["phase-e"],
  blocked: false,
};

describe("/api/tasks", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(getCurrentWorkspaceId).mockReset();
    vi.mocked(listTasks).mockReset();
    vi.mocked(listTasksByStatus).mockReset();
    vi.mocked(createTask).mockReset();
  });

  describe("GET", () => {
    it("returns 200 + flat task list when no groupBy is set", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listTasks).mockResolvedValue([
        { id: "t1", title: "Wire up" },
      ] as never);

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(200);
      expect(response.json).toEqual([{ id: "t1", title: "Wire up" }]);
    });

    it("returns 200 + status-grouped JSON when ?groupBy=status", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listTasksByStatus).mockResolvedValue({
        backlog: [],
        todo: [{ id: "t1" }],
        in_progress: [],
        in_review: [],
        done: [],
      } as never);

      const response = await callRoute(GETHandler, {
        url: "http://localhost:3000/api/tasks?groupBy=status",
      });
      expect(response.status).toBe(200);
      const body = response.json as { todo: Array<{ id: string }> };
      expect(body.todo).toHaveLength(1);
    });

    it("returns 500 when listTasks throws", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(listTasks).mockRejectedValue(new Error("rls denied"));

      const response = await callRoute(GETHandler);
      expect(response.status).toBe(500);
      expect(response.json).toEqual({ error: "rls denied" });
    });
  });

  describe("POST", () => {
    it("creates a task and returns 201", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(getCurrentWorkspaceId).mockResolvedValue("ws_42");
      vi.mocked(createTask).mockResolvedValue({
        id: "t_new",
        title: "Wire up dashboard",
      } as never);

      const response = await callRoute(POSTHandler, {
        method: "POST",
        body: validTaskBody,
      });
      expect(response.status).toBe(201);
      expect(response.json).toEqual({ id: "t_new", title: "Wire up dashboard" });
      expect(getCurrentWorkspaceId).toHaveBeenCalledTimes(1);
    });

    it("returns 400 for invalid JSON", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      const response = await callRoute(POSTHandler, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "nope{",
      });
      expect(response.status).toBe(400);
      expect(response.json).toEqual({ error: "Invalid JSON" });
    });

    it("returns 400 with Zod issues on schema failure", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      const response = await callRoute(POSTHandler, {
        method: "POST",
        body: { title: "missing project id" },
      });
      expect(response.status).toBe(400);
      const body = response.json as { error: string; issues: unknown };
      expect(body.error).toBe("Validation failed");
      expect(body.issues).toBeDefined();
    });

    it("returns 500 when createTask throws", async () => {
      vi.mocked(requireUser).mockResolvedValue(SESSION);
      vi.mocked(getCurrentWorkspaceId).mockResolvedValue("ws_42");
      vi.mocked(createTask).mockRejectedValue(new Error("no row returned"));

      const response = await callRoute(POSTHandler, {
        method: "POST",
        body: validTaskBody,
      });
      expect(response.status).toBe(500);
      expect(response.json).toEqual({ error: "no row returned" });
    });
  });
});
