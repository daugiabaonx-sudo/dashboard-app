// tests/unit/db/profiles.test.ts
// Unit tests for lib/db/profiles.ts — covers listProfiles + getProfile.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listProfiles, getProfile } from "@/lib/db/profiles";
import {
  makeQueryChain,
  stubSupabase,
  type QueryChain,
} from "../_helpers/query-chain";

describe("profiles", () => {
  let chain: QueryChain;

  beforeEach(() => {
    chain = makeQueryChain();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      stubSupabase(chain) as never,
    );
  });

  describe("listProfiles", () => {
    it("selects * from profiles with no filter", async () => {
      chain.__setResult({ data: [], error: null });
      await listProfiles();

      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).not.toHaveBeenCalled();
      expect(chain.order).not.toHaveBeenCalled();
    });

    it("maps each row snake_case → camelCase User", async () => {
      chain.__setResult({
        data: [
          {
            id: "u1",
            email: "alice@example.com",
            full_name: "Alice Park",
            initials: "AP",
            avatar_color: "#f97316",
            department: "Engineering",
            role: "admin",
            capacity_hours: 36,
            joined_at: "2025-01-15",
          },
        ],
        error: null,
      });

      const [user] = await listProfiles();

      expect(user).toEqual({
        id: "u1",
        email: "alice@example.com",
        name: "Alice Park",
        initials: "AP",
        avatarColor: "#f97316",
        department: "Engineering",
        role: "admin",
        capacityHours: 36,
        joinedAt: "2025-01-15",
      });
    });

    it("returns an empty array when data is null", async () => {
      chain.__setResult({ data: null, error: null });
      const users = await listProfiles();
      expect(users).toEqual([]);
    });

    it("throws listProfiles-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(listProfiles()).rejects.toThrow("listProfiles: rls");
    });
  });

  describe("getProfile", () => {
    it("queries by id with eq", async () => {
      chain.__setResult({ data: [], error: null });
      await getProfile("u1");

      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("id", "u1");
    });

    it("returns the mapped User when the row exists", async () => {
      chain.__setResult({
        data: [
          {
            id: "u1",
            email: "alice@example.com",
            full_name: "Alice Park",
            initials: "AP",
            avatar_color: "#f97316",
            department: "Engineering",
            role: "admin",
            capacity_hours: 36,
            joined_at: "2025-01-15",
          },
        ],
        error: null,
      });

      const user = await getProfile("u1");
      expect(user?.id).toBe("u1");
      expect(user?.name).toBe("Alice Park");
      expect(user?.capacityHours).toBe(36);
    });

    it("returns null when no row matches", async () => {
      chain.__setResult({ data: [], error: null });
      const user = await getProfile("missing");
      expect(user).toBeNull();
    });

    it("returns null when data is null (treat as no row)", async () => {
      chain.__setResult({ data: null, error: null });
      const user = await getProfile("u1");
      expect(user).toBeNull();
    });

    it("throws getProfile-prefixed error on query failure", async () => {
      chain.__setResult({ data: null, error: { message: "rls" } });
      await expect(getProfile("u1")).rejects.toThrow("getProfile: rls");
    });
  });
});
