// tests/unit/auth/role.test.ts
// The signed-in user's role is read from their profile; any failure or
// unknown value means "no role" (read-only), never an elevated role.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/profiles", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn() }));

import { getProfile } from "@/lib/db/profiles";
import { error as logError } from "@/lib/logger";
import { getUserRole } from "@/lib/auth/role";
import type { User } from "@/lib/types";

const PROFILE = { id: "u1", name: "A", email: "a@b.c", role: "manager" } as User;

beforeEach(() => vi.clearAllMocks());

describe("getUserRole", () => {
  it("returns the profile role", async () => {
    vi.mocked(getProfile).mockResolvedValue(PROFILE);
    expect(await getUserRole("u1")).toBe("manager");
    expect(getProfile).toHaveBeenCalledWith("u1");
  });

  it("returns null when there is no profile", async () => {
    vi.mocked(getProfile).mockResolvedValue(null);
    expect(await getUserRole("u1")).toBeNull();
  });

  it("returns null for an unknown role value", async () => {
    vi.mocked(getProfile).mockResolvedValue({ ...PROFILE, role: "root" as User["role"] });
    expect(await getUserRole("u1")).toBeNull();
  });

  it("returns null and logs when the lookup fails", async () => {
    vi.mocked(getProfile).mockRejectedValue(new Error("db down"));
    expect(await getUserRole("u1")).toBeNull();
    expect(logError).toHaveBeenCalledWith("auth.role_lookup_failed", expect.objectContaining({ detail: "db down" }));
  });
});
