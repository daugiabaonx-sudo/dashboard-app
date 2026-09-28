// tests/integration/api/auth.sign-in.test.ts
// Integration tests for POST /api/auth/sign-in.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  isMockMode: true,
  signedInUserId: null as string | null,
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
import { POST } from "@/app/api/auth/sign-in/route";
import { callRoute } from "../_helpers/call-route";

describe("POST /api/auth/sign-in", () => {
  beforeEach(() => {
    mockState.isMockMode = true;
    mockState.signedInUserId = null;
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await callRoute(POST, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "nope{",
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 with Zod issues on missing fields", async () => {
    const response = await callRoute(POST, {
      method: "POST",
      body: { email: "alice@example.com" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 401 when signInWithPassword returns an error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Invalid credentials" },
        }),
      },
    } as never);

    const response = await callRoute(POST, {
      method: "POST",
      body: { email: "alice@example.com", password: "wrong-password" },
    });
    expect(response.status).toBe(401);
    expect(response.json).toEqual({ error: "Invalid credentials" });
  });

  it("returns 200 + the user profile on success and persists signedInUserId in mock mode", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth_uid_1",
              email: "alice@example.com",
              user_metadata: { full_name: "Alice Owner" },
            },
          },
          error: null,
        }),
      },
    } as never);

    const response = await callRoute(POST, {
      method: "POST",
      body: { email: "alice@example.com", password: "correct-password" },
    });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      userId: "auth_uid_1",
      email: "alice@example.com",
      fullName: "Alice Owner",
    });
    expect(mockState.signedInUserId).toBe("auth_uid_1");
    expect(
      response.cookies.find((c) => c.name === "mock-sunext-auth")?.value,
    ).toBe("1");
  });

  it("does NOT set the mock-sunext-auth cookie outside mock mode", async () => {
    mockState.isMockMode = false;
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth_uid_2",
              email: "bob@example.com",
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    } as never);

    const response = await callRoute(POST, {
      method: "POST",
      body: { email: "bob@example.com", password: "good-password" },
    });
    expect(response.status).toBe(200);
    expect(response.cookies).toHaveLength(0);
  });
});
