// tests/unit/db/stats.test.ts
// Unit tests for lib/db/stats.ts — covers getKpis + getTeamWorkload (RPC calls).

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getKpis, getTeamWorkload } from "@/lib/db/stats";

describe("stats", () => {
  let rpc: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rpc = vi.fn();
    from = vi.fn();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      rpc,
      from,
    } as never);
  });

  describe("getKpis", () => {
    it("calls rpc('workspace_kpis') with the workspace_id", async () => {
      rpc.mockResolvedValue({ data: [], error: null });
      await getKpis("ws_42");

      expect(rpc).toHaveBeenCalledWith("workspace_kpis", {
        workspace_id: "ws_42",
      });
      expect(from).not.toHaveBeenCalled();
    });

    it("returns the rows cast as DashboardKpi[]", async () => {
      const rows = [
        { id: "tasks_due", value: 7 },
        { id: "overdue", value: 2 },
      ];
      rpc.mockResolvedValue({ data: rows, error: null });

      const kpis = await getKpis("ws_42");
      expect(kpis).toEqual(rows);
    });

    it("returns an empty array when rpc data is null", async () => {
      rpc.mockResolvedValue({ data: null, error: null });
      const kpis = await getKpis("ws_42");
      expect(kpis).toEqual([]);
    });

    it("throws getKpis-prefixed error on rpc failure", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "rpc dead" } });
      await expect(getKpis("ws_42")).rejects.toThrow("getKpis: rpc dead");
    });
  });

  describe("getTeamWorkload", () => {
    it("calls rpc('workspace_workload') with the workspace_id", async () => {
      rpc.mockResolvedValue({ data: [], error: null });
      await getTeamWorkload("ws_42");

      expect(rpc).toHaveBeenCalledWith("workspace_workload", {
        workspace_id: "ws_42",
      });
    });

    it("returns the rows cast as TeamWorkload[]", async () => {
      const rows = [
        {
          userId: "u1",
          assignedTasks: 4,
          completedTasks: 2,
          overdueTasks: 1,
          utilization: 88,
        },
      ];
      rpc.mockResolvedValue({ data: rows, error: null });

      const workload = await getTeamWorkload("ws_42");
      expect(workload).toEqual(rows);
    });

    it("returns an empty array when rpc data is null", async () => {
      rpc.mockResolvedValue({ data: null, error: null });
      const workload = await getTeamWorkload("ws_42");
      expect(workload).toEqual([]);
    });

    it("throws getTeamWorkload-prefixed error on rpc failure", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "unauthorized" } });
      await expect(getTeamWorkload("ws_42")).rejects.toThrow(
        "getTeamWorkload: unauthorized",
      );
    });
  });
});
