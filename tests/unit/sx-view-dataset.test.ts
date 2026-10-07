// tests/unit/sx-view-dataset.test.ts
// Projects / Tasks pages pick Planner data when configured, mock otherwise,
// and fall back to mock (with a visible note) when Planner fails.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/planner/config", () => ({ isPlannerConfigured: vi.fn() }));
vi.mock("@/lib/planner/planner-dataset", () => ({ loadPlannerDataset: vi.fn() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn() }));

import { isPlannerConfigured } from "@/lib/planner/config";
import { loadPlannerDataset } from "@/lib/planner/planner-dataset";
import { error as logError } from "@/lib/logger";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

const PLANNER_DS = {
  source: "planner" as const,
  employees: [],
  projects: [],
  tasks: [],
  blockers: [],
  projectHealth: [],
  notifications: [],
};

beforeEach(() => vi.clearAllMocks());

describe("getSxViewDataset", () => {
  it("uses the mock dataset when Planner is not configured", async () => {
    vi.mocked(isPlannerConfigured).mockReturnValue(false);
    const ds = await getSxViewDataset();
    expect(ds.source).toBeUndefined();
    expect(ds.tasks.length).toBeGreaterThan(0);
    expect(loadPlannerDataset).not.toHaveBeenCalled();
  });

  it("uses Planner data when configured", async () => {
    vi.mocked(isPlannerConfigured).mockReturnValue(true);
    vi.mocked(loadPlannerDataset).mockResolvedValue(PLANNER_DS);
    expect(await getSxViewDataset()).toBe(PLANNER_DS);
  });

  it("falls back to mock with a note and logs when Planner fails", async () => {
    vi.mocked(isPlannerConfigured).mockReturnValue(true);
    vi.mocked(loadPlannerDataset).mockRejectedValue(new Error("boom"));
    const ds = await getSxViewDataset();
    expect(ds.source).toBeUndefined();
    expect(ds.sourceNote).toMatch(/Planner/);
    expect(logError).toHaveBeenCalledWith("planner.dataset_failed", expect.objectContaining({ detail: "boom" }));
  });
});
