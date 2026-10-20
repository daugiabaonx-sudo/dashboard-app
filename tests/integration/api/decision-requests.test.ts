// tests/integration/api/decision-requests.test.ts
// Integration tests for GET/POST /api/decision-requests and PATCH /api/decision-requests/[id].

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentWorkspaceId: vi.fn().mockResolvedValue("00000000-0000-0000-0000-000000000001"),
}));
vi.mock("@/lib/auth/role", () => ({
  getUserRole: vi.fn(),
}));
vi.mock("@/lib/db/decision-requests", () => ({
  listOpenDecisionRequests: vi.fn(),
  findOpenDecisionByTask: vi.fn(),
  createDecisionRequest: vi.fn(),
  getDecisionRequestById: vi.fn(),
  resolveDecisionRequest: vi.fn(),
}));
vi.mock("@/lib/planner/blocker-sync", () => ({
  syncPlannerBlockedPrefix: vi.fn().mockResolvedValue(true),
}));

import { requireUser } from "@/lib/auth/session";
import { getUserRole } from "@/lib/auth/role";
import {
  createDecisionRequest,
  findOpenDecisionByTask,
  getDecisionRequestById,
  listOpenDecisionRequests,
  resolveDecisionRequest,
} from "@/lib/db/decision-requests";
import { syncPlannerBlockedPrefix } from "@/lib/planner/blocker-sync";
import { GET, POST } from "@/app/api/decision-requests/route";
import { PATCH } from "@/app/api/decision-requests/[id]/route";
import { callRoute, type RouteHandlerFn } from "../_helpers/call-route";

const GETHandler = GET as unknown as RouteHandlerFn;
const POSTHandler = POST as unknown as RouteHandlerFn;
const PATCHHandler = PATCH as unknown as RouteHandlerFn;

const EMP_SESSION = {
  userId: "00000000-0000-0000-0000-00000000000b",
  email: "emp@sunext.vn",
  fullName: "Hanh Nguyen",
};

const MGR_SESSION = {
  userId: "00000000-0000-0000-0000-00000000000a",
  email: "mgr@sunext.vn",
  fullName: "Bao Dau",
};

const OPEN_REQ = {
  id: "dr-100",
  workspaceId: "00000000-0000-0000-0000-000000000001",
  plannerTaskId: "task-1",
  taskTitle: "Làm luồng cho các team",
  projectName: "Sunext Manage Task",
  type: "decision" as const,
  need: "Cần chốt phương án A hay B",
  raisedBy: EMP_SESSION.userId,
  unblockerId: MGR_SESSION.userId,
  neededBy: "2026-10-22",
  status: "open" as const,
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: "2026-10-20T01:00:00.000Z",
  updatedAt: "2026-10-20T01:00:00.000Z",
};

describe("/api/decision-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 200 with open decision requests for the workspace", async () => {
      vi.mocked(requireUser).mockResolvedValue(EMP_SESSION);
      vi.mocked(listOpenDecisionRequests).mockResolvedValue([OPEN_REQ]);

      const res = await callRoute(GETHandler);
      expect(res.status).toBe(200);
      expect(res.json).toEqual([OPEN_REQ]);
    });
  });

  describe("POST", () => {
    const validBody = {
      plannerTaskId: "task-1",
      taskTitle: "Làm luồng cho các team",
      projectName: "Sunext Manage Task",
      type: "decision",
      need: "Cần chốt phương án A hay B",
      unblockerId: MGR_SESSION.userId,
      neededBy: "2026-10-22",
    };

    it("returns 403 when caller has viewer role", async () => {
      vi.mocked(requireUser).mockResolvedValue(EMP_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("viewer");

      const res = await callRoute(POSTHandler, { method: "POST", body: validBody });
      expect(res.status).toBe(403);
    });

    it("returns 400 when input fails schema validation", async () => {
      vi.mocked(requireUser).mockResolvedValue(EMP_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("member");

      const res = await callRoute(POSTHandler, {
        method: "POST",
        body: { ...validBody, need: "   " },
      });
      expect(res.status).toBe(400);
    });

    it("returns 409 when an open decision request already exists for the task", async () => {
      vi.mocked(requireUser).mockResolvedValue(EMP_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("member");
      vi.mocked(findOpenDecisionByTask).mockResolvedValue(OPEN_REQ);

      const res = await callRoute(POSTHandler, { method: "POST", body: validBody });
      expect(res.status).toBe(409);
    });

    it("creates a decision request (201) and syncs [Bị chặn] prefix on Planner", async () => {
      vi.mocked(requireUser).mockResolvedValue(EMP_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("member");
      vi.mocked(findOpenDecisionByTask).mockResolvedValue(null);
      vi.mocked(createDecisionRequest).mockResolvedValue(OPEN_REQ);

      const res = await callRoute(POSTHandler, { method: "POST", body: validBody });
      expect(res.status).toBe(201);
      expect(res.json).toEqual({ request: OPEN_REQ, plannerSynced: true });
      expect(syncPlannerBlockedPrefix).toHaveBeenCalledWith("task-1", true);
    });
  });

  describe("PATCH /api/decision-requests/[id]", () => {
    it("returns 404 when request does not exist or is already closed", async () => {
      vi.mocked(requireUser).mockResolvedValue(MGR_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("manager");
      vi.mocked(getDecisionRequestById).mockResolvedValue(null);

      const res = await callRoute(PATCHHandler, {
        method: "PATCH",
        params: { id: "dr-404" },
        body: { action: "resolve", resolution: "OK" },
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 when a non-unblocker member tries to resolve", async () => {
      vi.mocked(requireUser).mockResolvedValue(EMP_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("member");
      vi.mocked(getDecisionRequestById).mockResolvedValue(OPEN_REQ);

      const res = await callRoute(PATCHHandler, {
        method: "PATCH",
        params: { id: "dr-100" },
        body: { action: "resolve", resolution: "Tự chốt" },
      });
      expect(res.status).toBe(403);
    });

    it("returns 400 when resolving a decision-type request without resolution text", async () => {
      vi.mocked(requireUser).mockResolvedValue(MGR_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("manager");
      vi.mocked(getDecisionRequestById).mockResolvedValue(OPEN_REQ);

      const res = await callRoute(PATCHHandler, {
        method: "PATCH",
        params: { id: "dr-100" },
        body: { action: "resolve", resolution: "   " },
      });
      expect(res.status).toBe(400);
    });

    it("resolves (200) and strips [Bị chặn] prefix on Planner when called by unblocker", async () => {
      vi.mocked(requireUser).mockResolvedValue(MGR_SESSION);
      vi.mocked(getUserRole).mockResolvedValue("manager");
      vi.mocked(getDecisionRequestById).mockResolvedValue(OPEN_REQ);
      const resolvedReq = { ...OPEN_REQ, status: "resolved" as const, resolution: "Chọn phương án A" };
      vi.mocked(resolveDecisionRequest).mockResolvedValue(resolvedReq);

      const res = await callRoute(PATCHHandler, {
        method: "PATCH",
        params: { id: "dr-100" },
        body: { action: "resolve", resolution: "Chọn phương án A" },
      });
      expect(res.status).toBe(200);
      expect(res.json).toEqual({ request: resolvedReq, plannerSynced: true });
      expect(syncPlannerBlockedPrefix).toHaveBeenCalledWith("task-1", false);
    });
  });
});
