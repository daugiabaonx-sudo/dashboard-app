// tests/unit/db/decision-requests.test.ts
// Unit tests for lib/db/decision-requests.ts.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentWorkspaceId: vi.fn().mockResolvedValue("00000000-0000-0000-0000-000000000001"),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createDecisionRequest,
  findOpenDecisionByTask,
  getDecisionRequestById,
  listOpenDecisionRequests,
  resolveDecisionRequest,
} from "@/lib/db/decision-requests";
import { makeQueryChain, stubSupabase, type QueryChain } from "../_helpers/query-chain";

const SAMPLE_ROW = {
  id: "dr_1",
  workspace_id: "00000000-0000-0000-0000-000000000001",
  planner_task_id: "task_1",
  task_title: "Làm luồng cho các team",
  project_name: "Sunext Manage Task",
  type: "decision",
  need: "Cần chốt luồng duyệt",
  raised_by: "00000000-0000-0000-0000-00000000000b",
  unblocker_id: "00000000-0000-0000-0000-00000000000a",
  needed_by: "2026-10-22",
  status: "open",
  resolution: null,
  resolved_by: null,
  resolved_at: null,
  created_at: "2026-10-20T01:00:00.000Z",
  updated_at: "2026-10-20T01:00:00.000Z",
};

describe("lib/db/decision-requests", () => {
  let chain: QueryChain;

  beforeEach(() => {
    chain = makeQueryChain();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stubSupabase(chain) as never);
    vi.mocked(revalidatePath).mockClear();
  });

  describe("listOpenDecisionRequests", () => {
    it("queries open requests for the workspace ordered by created_at asc", async () => {
      chain.__setResult({ data: [SAMPLE_ROW], error: null });
      const items = await listOpenDecisionRequests("ws_1");
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("workspace_id", "ws_1");
      expect(chain.eq).toHaveBeenCalledWith("status", "open");
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: "dr_1",
        plannerTaskId: "task_1",
        taskTitle: "Làm luồng cho các team",
        type: "decision",
        need: "Cần chốt luồng duyệt",
        raisedBy: "00000000-0000-0000-0000-00000000000b",
        unblockerId: "00000000-0000-0000-0000-00000000000a",
        status: "open",
      });
    });

    it("throws with context on query error", async () => {
      chain.__setResult({ data: null, error: { message: "db down" } });
      await expect(listOpenDecisionRequests("ws_1")).rejects.toThrow("listOpenDecisionRequests: db down");
    });

    it("falls back to mockClient when the remote decision_requests table is not in schema cache yet", async () => {
      const schemaCacheError = {
        code: "PGRST205",
        message: "Could not find the table 'public.decision_requests' in the schema cache",
      };
      chain.__setResult({ data: null, error: schemaCacheError });

      const created = await createDecisionRequest({
        workspaceId: "ws_fallback",
        plannerTaskId: "task_fb",
        taskTitle: "Task Fallback",
        projectName: "Sunext Manage Task",
        type: "waiting_on",
        need: "Chờ thiết kế",
        raisedBy: SAMPLE_ROW.raised_by,
        unblockerId: SAMPLE_ROW.unblocker_id,
        neededBy: null,
      });
      expect(created.plannerTaskId).toBe("task_fb");

      const list = await listOpenDecisionRequests("ws_fallback");
      expect(list.some((r) => r.id === created.id)).toBe(true);

      const byId = await getDecisionRequestById(created.id);
      expect(byId?.id).toBe(created.id);

      const byTask = await findOpenDecisionByTask("task_fb", "ws_fallback");
      expect(byTask?.id).toBe(created.id);

      const resolved = await resolveDecisionRequest(created.id, {
        action: "cancel",
        resolution: "",
        actorId: SAMPLE_ROW.raised_by,
      });
      expect(resolved.status).toBe("cancelled");
    });
  });

  describe("getDecisionRequestById & findOpenDecisionByTask", () => {
    it("returns mapped request or null when not found", async () => {
      chain.__setResult({ data: [SAMPLE_ROW], error: null });
      const found = await getDecisionRequestById("dr_1");
      expect(found?.id).toBe("dr_1");

      chain.__setResult({ data: [], error: null });
      expect(await getDecisionRequestById("missing")).toBeNull();
      expect(await findOpenDecisionByTask("task_1", "ws_1")).toBeNull();
    });
  });

  describe("createDecisionRequest", () => {
    it("inserts an open request and revalidates /", async () => {
      chain.__setResult({ data: [SAMPLE_ROW], error: null });
      const created = await createDecisionRequest({
        workspaceId: "ws_1",
        plannerTaskId: "task_1",
        taskTitle: "Làm luồng cho các team",
        projectName: "Sunext Manage Task",
        type: "decision",
        need: "Cần chốt luồng duyệt",
        raisedBy: SAMPLE_ROW.raised_by,
        unblockerId: SAMPLE_ROW.unblocker_id,
        neededBy: "2026-10-22",
      });
      expect(chain.insert).toHaveBeenCalled();
      expect(created.id).toBe("dr_1");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("resolveDecisionRequest", () => {
    it("updates status to resolved or cancelled and records resolution", async () => {
      chain.__setResult({
        data: [
          {
            ...SAMPLE_ROW,
            status: "resolved",
            resolution: "Đã duyệt phương án 1",
            resolved_by: SAMPLE_ROW.unblocker_id,
            resolved_at: "2026-10-20T05:00:00.000Z",
          },
        ],
        error: null,
      });
      const updated = await resolveDecisionRequest("dr_1", {
        action: "resolve",
        resolution: "Đã duyệt phương án 1",
        actorId: SAMPLE_ROW.unblocker_id,
      });
      expect(chain.update).toHaveBeenCalled();
      expect(updated.status).toBe("resolved");
      expect(updated.resolution).toBe("Đã duyệt phương án 1");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });
});
