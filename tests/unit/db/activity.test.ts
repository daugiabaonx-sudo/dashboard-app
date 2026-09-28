// tests/unit/db/activity.test.ts
// Unit tests for lib/db/activity.ts — covers listRecentActivity.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listRecentActivity } from "@/lib/db/activity";
import {
  makeQueryChain,
  stubSupabase,
  type QueryChain,
} from "../_helpers/query-chain";

describe("listRecentActivity", () => {
  let chain: QueryChain;

  beforeEach(() => {
    chain = makeQueryChain();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      stubSupabase(chain) as never,
    );
  });

  it("queries activity_log with select=*, order created_at desc, and the default limit of 12", async () => {
    chain.__setResult({ data: [], error: null });
    await listRecentActivity();

    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(chain.limit).toHaveBeenCalledWith(12);
  });

  it("honours an explicit limit override", async () => {
    chain.__setResult({ data: [], error: null });
    await listRecentActivity(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it("maps each snake_case row to a camelCase Activity", async () => {
    chain.__setResult({
      data: [
        {
          id: "act_1",
          workspace_id: "ws_1",
          actor_id: "user_1",
          type: "task_completed",
          target_type: "task",
          target_id: "t_1",
          target_title: "Ship it",
          message: "Marked done",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const [item] = await listRecentActivity();

    expect(item).toEqual({
      id: "act_1",
      actorId: "user_1",
      type: "task_completed",
      targetType: "task",
      targetId: "t_1",
      targetTitle: "Ship it",
      message: "Marked done",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("returns an empty array when data is null", async () => {
    chain.__setResult({ data: null, error: null });
    const items = await listRecentActivity();
    expect(items).toEqual([]);
  });

  it("throws listRecentActivity-prefixed error when the query errors", async () => {
    chain.__setResult({ data: null, error: { message: "boom" } });
    await expect(listRecentActivity()).rejects.toThrow(
      "listRecentActivity: boom",
    );
  });
});
