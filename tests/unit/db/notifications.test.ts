// tests/unit/db/notifications.test.ts
// Unit tests for lib/db/notifications.ts — covers listNotifications + markAllRead.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { listNotifications, markAllRead } from "@/lib/db/notifications";
import {
  makeQueryChain,
  stubSupabase,
  type QueryChain,
} from "../_helpers/query-chain";

describe("notifications", () => {
  let chain: QueryChain;

  beforeEach(() => {
    chain = makeQueryChain();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      stubSupabase(chain) as never,
    );
    vi.mocked(revalidatePath).mockClear();
  });

  describe("listNotifications", () => {
    it("filters by user_id, orders by created_at desc", async () => {
      chain.__setResult({ data: [], error: null });
      await listNotifications("user_42");

      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user_42");
      expect(chain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("maps each row snake_case → camelCase", async () => {
      chain.__setResult({
        data: [
          {
            id: "n1",
            user_id: "u1",
            type: "mention",
            title: "Heads up",
            body: "@you in comment",
            link: "/tasks/t1",
            read: false,
            created_at: "2026-02-01T10:00:00Z",
          },
        ],
        error: null,
      });

      const [item] = await listNotifications("u1");

      expect(item).toEqual({
        id: "n1",
        type: "mention",
        title: "Heads up",
        body: "@you in comment",
        link: "/tasks/t1",
        read: false,
        createdAt: "2026-02-01T10:00:00Z",
      });
    });

    it("returns an empty array when data is null", async () => {
      chain.__setResult({ data: null, error: null });
      const items = await listNotifications("u1");
      expect(items).toEqual([]);
    });

    it("throws listNotifications-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls denied" } });
      await expect(listNotifications("u1")).rejects.toThrow(
        "listNotifications: rls denied",
      );
    });
  });

  describe("markAllRead", () => {
    it("updates read=true and filters by user_id", async () => {
      chain.__setResult({ data: null, error: null });
      await markAllRead("u1");

      expect(chain.update).toHaveBeenCalledWith({ read: true });
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("revalidates the workspace home path", async () => {
      chain.__setResult({ data: null, error: null });
      await markAllRead("u1");
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it("throws markAllRead-prefixed error on update failure", async () => {
      chain.__setResult({ data: null, error: { message: "permission denied" } });
      await expect(markAllRead("u1")).rejects.toThrow(
        "markAllRead: permission denied",
      );
    });
  });
});
