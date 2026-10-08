// tests/unit/sx-view-dataset.test.ts
// Every dashboard page shows Microsoft Planner data only: when Planner is not
// configured or fails, pages get an EMPTY dataset plus a visible note —
// never the in-app demo data.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/planner/config", () => ({ isPlannerConfigured: vi.fn() }));
vi.mock("@/lib/planner/planner-dataset", () => ({ loadPlannerDataset: vi.fn() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn() }));
// `cacheLife` from next/cache only works inside the Next runtime
// (process.env.__NEXT_USE_CACHE set). Vitest runs in plain Node, so
// stub it as a no-op — the real `cacheComponents` config is exercised
// by `next build` and the dev server, not by unit tests.
vi.mock("next/cache", () => ({ cacheLife: () => undefined }));

import { isPlannerConfigured } from "@/lib/planner/config";
import { loadPlannerDataset } from "@/lib/planner/planner-dataset";
import { error as logError } from "@/lib/logger";
import { emptyPlannerDataset, getSxViewDataset } from "@/lib/sx-view-dataset";

const PLANNER_DS = {
  source: "planner" as const,
  employees: [],
  projects: [],
  tasks: [],
  blockers: [],
  projectHealth: [],
  notifications: [],
};

function expectEmpty(ds: Awaited<ReturnType<typeof getSxViewDataset>>) {
  expect(ds.source).toBe("planner");
  expect(ds.employees).toEqual([]);
  expect(ds.projects).toEqual([]);
  expect(ds.tasks).toEqual([]);
  expect(ds.blockers).toEqual([]);
  expect(ds.projectHealth).toEqual([]);
  expect(ds.notifications).toEqual([]);
}

beforeEach(() => vi.clearAllMocks());

describe("emptyPlannerDataset", () => {
  it("has no records, the Planner source and the given note", () => {
    const ds = emptyPlannerDataset("note");
    expectEmpty(ds);
    expect(ds.sourceNote).toBe("note");
  });

  it("returns a fresh object every call", () => {
    expect(emptyPlannerDataset("a")).not.toBe(emptyPlannerDataset("a"));
  });
});

describe("getSxViewDataset", () => {
  it("returns an empty dataset with a setup note when Planner is not configured", async () => {
    vi.mocked(isPlannerConfigured).mockReturnValue(false);
    const ds = await getSxViewDataset();
    expectEmpty(ds);
    expect(ds.sourceNote).toMatch(/Chưa cấu hình Microsoft Planner/);
    expect(loadPlannerDataset).not.toHaveBeenCalled();
  });

  it("uses Planner data when configured", async () => {
    vi.mocked(isPlannerConfigured).mockReturnValue(true);
    vi.mocked(loadPlannerDataset).mockResolvedValue(PLANNER_DS);
    expect(await getSxViewDataset()).toBe(PLANNER_DS);
  });

  it("returns an empty dataset with an error note (no demo data) and logs when Planner fails", async () => {
    vi.mocked(isPlannerConfigured).mockReturnValue(true);
    vi.mocked(loadPlannerDataset).mockRejectedValue(new Error("boom"));
    const ds = await getSxViewDataset();
    expectEmpty(ds);
    expect(ds.sourceNote).toMatch(/Không tải được dữ liệu Microsoft Planner/);
    expect(ds.sourceNote).not.toMatch(/mẫu/);
    expect(logError).toHaveBeenCalledWith("planner.dataset_failed", expect.objectContaining({ detail: "boom" }));
  });
});
