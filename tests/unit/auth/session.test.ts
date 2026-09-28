// tests/unit/auth/session.test.ts
// Unit tests for lib/auth/session.ts — covers 4 functions across mock + real Supabase
// modes, including the redirect side effect of requireUser().

import { beforeEach, describe, expect, it, vi } from "vitest";

// Module-level mocks (declared before import so vi.fn references exist by the
// time lib/auth/session.ts is first evaluated).

const authMockState = vi.hoisted(() => {
  return {
    signedInUserId: "00000000-0000-0000-0000-00000000000a" as string | null,
    isMockMode: true,
  };
});

vi.mock("@/lib/supabase/mock", () => ({
  getSignedInUserId: vi.fn(() => authMockState.signedInUserId),
  setSignedInUserId: vi.fn((id: string | null) => {
    authMockState.signedInUserId = id;
  }),
  MOCK_DEFAULT_USER_ID: "00000000-0000-0000-0000-00000000000a",
  MOCK_DEFAULT_USER: {
    email: "alice@example.com",
    name: "Alice Owner",
  },
}));

vi.mock("@/lib/supabase/env", () => {
  // Getter so per-test toggling of authMockState.isMockMode takes effect even
  // though lib/auth/session.ts captures `isMockMode` once at import-time.
  // The captured value is the getter result each call returns, not the
  // original boolean snapshot.
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
      return authMockState.isMockMode;
    },
  });
  return env;
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/constants", () => ({
  DEFAULT_WORKSPACE_ID: "00000000-0000-0000-0000-000000000001",
}));

const cookieStoreMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStoreMock),
}));

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    // Faithfully mimic Next's redirect() — it throws a special error with
    // a digest prefix so the framework can intercept. Callers don't catch.
    const err = new Error(`NEXT_REDIRECT;replace;${url};307`);
    (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307`;
    throw err;
  },
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSession,
  requireUser,
  getCurrentWorkspaceId,
  getMockSignedInUserId,
} from "@/lib/auth/session";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-00000000000a";
const OTHER_USER_ID = "00000000-0000-0000-0000-0000000000bb";
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const WORKSPACE_COOKIE = "sunext.active_workspace";

describe("session", () => {
  beforeEach(() => {
    authMockState.signedInUserId = DEFAULT_USER_ID;
    authMockState.isMockMode = true;
    vi.mocked(createSupabaseServerClient).mockReset();
    cookieStoreMock.get.mockReset();
    redirectMock.mockReset();
  });

  describe("getSession (mock mode)", () => {
    it("returns a Session seeded from MOCK_DEFAULT_USER when no one is signed in", async () => {
      authMockState.signedInUserId = null;
      const session = await getSession();
      expect(session).toEqual({
        userId: DEFAULT_USER_ID,
        email: "alice@example.com",
        fullName: "Alice Owner",
      });
    });

    it("returns the signed-in mock user's id paired with MOCK_DEFAULT_USER profile", async () => {
      authMockState.signedInUserId = OTHER_USER_ID;
      const session = await getSession();
      expect(session?.userId).toBe(OTHER_USER_ID);
      expect(session?.email).toBe("alice@example.com");
      expect(session?.fullName).toBe("Alice Owner");
    });

    it("does not call createSupabaseServerClient in mock mode", async () => {
      await getSession();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  });

  describe("getSession (real Supabase mode)", () => {
    beforeEach(() => {
      authMockState.isMockMode = false;
    });

    it("returns null when getUser() yields no user", async () => {
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      } as never);

      const session = await getSession();
      expect(session).toBeNull();
    });

    it("returns a Session derived from auth user + user_metadata.full_name", async () => {
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "auth_uid_1",
                email: "bob@example.com",
                user_metadata: { full_name: "Bob Builder" },
              },
            },
          }),
        },
      } as never);

      const session = await getSession();
      expect(session).toEqual({
        userId: "auth_uid_1",
        email: "bob@example.com",
        fullName: "Bob Builder",
      });
    });

    it("falls back to email local-part when user_metadata.full_name is missing", async () => {
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "auth_uid_2",
                email: "carol@example.com",
                user_metadata: {},
              },
            },
          }),
        },
      } as never);

      const session = await getSession();
      expect(session?.userId).toBe("auth_uid_2");
      expect(session?.fullName).toBe("carol");
    });

    it("falls back to 'User' when neither full_name nor email local-part is available", async () => {
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "auth_uid_3",
                email: null,
                user_metadata: null,
              },
            },
          }),
        },
      } as never);

      const session = await getSession();
      expect(session?.email).toBe("");
      expect(session?.fullName).toBe("User");
    });
  });

  describe("requireUser", () => {
    it("returns the Session when getSession() yields one (mock mode default)", async () => {
      const session = await requireUser();
      expect(session).toEqual({
        userId: DEFAULT_USER_ID,
        email: "alice@example.com",
        fullName: "Alice Owner",
      });
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it("throws redirect('/login') when there is no session in real mode", async () => {
      authMockState.isMockMode = false;
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      } as never);

      await expect(requireUser()).rejects.toThrow();
      expect(redirectMock).toHaveBeenCalledWith("/login");
    });
  });

  describe("getCurrentWorkspaceId", () => {
    it("returns the explicit cookie value when present", async () => {
      cookieStoreMock.get.mockReturnValue({
        value: "custom-workspace-uuid",
      });

      const ws = await getCurrentWorkspaceId();
      expect(ws).toBe("custom-workspace-uuid");
      expect(cookieStoreMock.get).toHaveBeenCalledWith(WORKSPACE_COOKIE);
    });

    it("returns DEFAULT_WORKSPACE_ID when the cookie is absent", async () => {
      cookieStoreMock.get.mockReturnValue(undefined);

      const ws = await getCurrentWorkspaceId();
      expect(ws).toBe(DEFAULT_WORKSPACE_ID);
    });

    it("returns DEFAULT_WORKSPACE_ID when the cookie value is an empty string", async () => {
      cookieStoreMock.get.mockReturnValue({ value: "" });

      const ws = await getCurrentWorkspaceId();
      expect(ws).toBe(DEFAULT_WORKSPACE_ID);
    });
  });

  describe("getMockSignedInUserId", () => {
    it("returns the signed-in id when set in mock mode", () => {
      authMockState.signedInUserId = OTHER_USER_ID;
      expect(getMockSignedInUserId()).toBe(OTHER_USER_ID);
    });

    it("falls back to MOCK_DEFAULT_USER_ID when no one is signed in but mock mode is on", () => {
      authMockState.signedInUserId = null;
      expect(getMockSignedInUserId()).toBe(DEFAULT_USER_ID);
    });

    it("returns null when not in mock mode and no one is signed in", () => {
      authMockState.signedInUserId = null;
      authMockState.isMockMode = false;
      expect(getMockSignedInUserId()).toBeNull();
    });
  });
});
