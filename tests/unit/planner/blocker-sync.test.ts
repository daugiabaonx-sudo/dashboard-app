// tests/unit/planner/blocker-sync.test.ts
// Unit tests for lib/planner/blocker-sync.ts.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  warn: vi.fn(),
}));
vi.mock("@/lib/planner/planner-api", () => ({
  getTask: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock("@/lib/planner/planner-dataset", () => ({
  invalidatePlannerSource: vi.fn(),
}));

import { revalidateTag } from "next/cache";
import { warn } from "@/lib/logger";
import { GraphError } from "@/lib/planner/errors";
import { getTask, updateTask } from "@/lib/planner/planner-api";
import { invalidatePlannerSource } from "@/lib/planner/planner-dataset";
import { syncPlannerBlockedPrefix } from "@/lib/planner/blocker-sync";

describe("syncPlannerBlockedPrefix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true without calling updateTask when title already has desired prefix state", async () => {
    vi.mocked(getTask).mockResolvedValue({
      id: "t1",
      planId: "p1",
      title: "[Bị chặn] Thiết kế",
      percentComplete: 50,
      priority: 5,
      "@odata.etag": 'W/"1"',
    } as never);

    expect(await syncPlannerBlockedPrefix("t1", true)).toBe(true);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("updates title prefix and invalidates planner cache", async () => {
    vi.mocked(getTask).mockResolvedValue({
      id: "t1",
      planId: "p1",
      title: "Thiết kế",
      percentComplete: 50,
      priority: 5,
      "@odata.etag": 'W/"1"',
    } as never);
    vi.mocked(updateTask).mockResolvedValue({ id: "t1" } as never);

    expect(await syncPlannerBlockedPrefix("t1", true)).toBe(true);
    expect(updateTask).toHaveBeenCalledWith("t1", 'W/"1"', { title: "[Bị chặn] Thiết kế" });
    expect(invalidatePlannerSource).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalled();
  });

  it("retries once with fresh ETag when Graph returns 412 Precondition Failed", async () => {
    vi.mocked(getTask)
      .mockResolvedValueOnce({
        id: "t1",
        planId: "p1",
        title: "Thiết kế",
        percentComplete: 50,
        priority: 5,
        "@odata.etag": 'W/"stale"',
      } as never)
      .mockResolvedValueOnce({
        id: "t1",
        planId: "p1",
        title: "Thiết kế",
        percentComplete: 50,
        priority: 5,
        "@odata.etag": 'W/"fresh"',
      } as never);

    vi.mocked(updateTask)
      .mockRejectedValueOnce(new GraphError("ETag mismatch", 412, "PreconditionFailed"))
      .mockResolvedValueOnce({ id: "t1" } as never);

    expect(await syncPlannerBlockedPrefix("t1", true)).toBe(true);
    expect(updateTask).toHaveBeenCalledTimes(2);
    expect(updateTask).toHaveBeenLastCalledWith("t1", 'W/"fresh"', { title: "[Bị chặn] Thiết kế" });
  });

  it("returns false when ETag is missing or when Graph throws a non-412 error", async () => {
    vi.mocked(getTask).mockResolvedValueOnce({
      id: "t1",
      planId: "p1",
      title: "Thiết kế",
      percentComplete: 50,
      priority: 5,
    } as never);
    expect(await syncPlannerBlockedPrefix("t1", true)).toBe(false);

    vi.mocked(getTask).mockRejectedValueOnce(new Error("Graph offline"));
    expect(await syncPlannerBlockedPrefix("t1", false)).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
