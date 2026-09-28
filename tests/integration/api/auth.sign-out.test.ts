// tests/integration/api/auth.sign-out.test.ts
// Integration tests for POST /api/auth/sign-out.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  isMockMode: true,
  signedInUserId: "auth_uid_1" as string | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/supabase/env", () => {
  const env: Record<string, unknown> = {
    supabaseEnv: {
      url: "http://mock.local",
      anonKey: "mock-anon-key",
      serviceKey: "mock-service-role-key",
      activeWorkspaceCookie: "sunext.active_workspace",
    },
  };
  Object.defineProperty(env, "isMockMode", {
    enumerable: true,
    configurable: true,
    get() {
      return mockState.isMockMode;
    },
  });
  return env;
});
vi.mock("@/lib/supabase/mock", () => ({
  setSignedInUserId: vi.fn((id: string | null) => {
    mockState.signedInUserId = id;
  }),
  getSignedInUserId: vi.fn(() => mockState.signedInUserId),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/auth/sign-out/route";
import { callRoute } from "../_helpers/call-route";

describe("POST /api/auth/sign-out", () => {
  beforeEach(() => {
    mockState.isMockMode = true;
    mockState.signedInUserId = "auth_uid_1";
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  it("returns 200 + {ok: true}, calls auth.signOut, clears signedInUserId, and deletes mock cookie in mock mode", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signOut },
    } as never);

    const response = await callRoute(POST, { method: "POST" });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockState.signedInUserId).toBeNull();
    // The mock cookie deletion must be present in the response cookies array.
    expect(
      response.cookies.some((c) => c.name === "mock-sunext-auth"),
    ).toBe(true);
  });

  it("does not touch the mock cookie outside mock mode", async () => {
    mockState.isMockMode = false;
    const signOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signOut },
    } as never);

    const response = await callRoute(POST, { method: "POST" });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(response.cookies).toHaveLength(0);
  });
});
