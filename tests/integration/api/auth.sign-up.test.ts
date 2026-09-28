// tests/integration/api/auth.sign-up.test.ts
// Integration tests for POST /api/auth/sign-up.

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
import { POST } from "@/app/api/auth/sign-up/route";
import { callRoute } from "../_helpers/call-route";

describe("POST /api/auth/sign-up", () => {
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

  it("returns 400 with Zod issues on missing fullName", async () => {
    const response = await callRoute(POST, {
      method: "POST",
      body: { email: "alice@example.com", password: "good-password" },
    });
    expect(response.status).toBe(400);
    const body = response.json as { error: string; issues: unknown };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 when signUp returns an error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Email already in use" },
        }),
      },
    } as never);

    const response = await callRoute(POST, {
      method: "POST",
      body: {
        email: "alice@example.com",
        password: "good-password",
        fullName: "Alice Owner",
      },
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "Email already in use" });
  });

  it("returns 200 + the user profile on success and persists signedInUserId", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "auth_uid_new",
              email: "carol@example.com",
              user_metadata: { full_name: "Carol Newcomer" },
            },
          },
          error: null,
        }),
      },
    } as never);

    const response = await callRoute(POST, {
      method: "POST",
      body: {
        email: "carol@example.com",
        password: "good-password",
        fullName: "Carol Newcomer",
      },
    });
    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      userId: "auth_uid_new",
      email: "carol@example.com",
      fullName: "Carol Newcomer",
    });
    expect(mockState.signedInUserId).toBe("auth_uid_new");
  });

  it("returns 400 'Sign up failed' when signUp returns no user and no error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const response = await callRoute(POST, {
      method: "POST",
      body: {
        email: "dave@example.com",
        password: "good-password",
        fullName: "Dave Newcomer",
      },
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "Sign up failed" });
  });
});
