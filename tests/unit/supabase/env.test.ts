// tests/unit/supabase/env.test.ts
// Unit tests for lib/supabase/env.ts: URL defaults, mock-mode gate, and
// per-service URL plumbing (gotrueUrl/realtimeUrl/metaUrl).
//
// The env module reads process.env at import time, so each test must
// isolate the module boundary via vi.resetModules() + dynamic re-import.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EnvModule = typeof import("@/lib/supabase/env");

const ORIGINAL_ENV = { ...process.env };

async function loadEnv(): Promise<EnvModule> {
  vi.resetModules();
  return await import("@/lib/supabase/env");
}

describe("lib/supabase/env", () => {
  beforeEach(() => {
    // Strip every var the env module reads so each test gets a clean slate.
    delete process.env.MOCK_SUPABASE;
    delete process.env.NEXT_PUBLIC_MOCK_SUPABASE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_GOTRUE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_META_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.ACTIVE_WORKSPACE_COOKIE;
  });

  afterEach(() => {
    // Restore any leaked process.env mutations from individual tests.
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  describe("mock-mode gate", () => {
    it("trips on the explicit MOCK_SUPABASE=1 flag", async () => {
      process.env.MOCK_SUPABASE = "1";
      const { isMockMode } = await loadEnv();
      expect(isMockMode).toBe(true);
    });

    it("trips on the implicit URL + key placeholder combination", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-replace-me";
      const { isMockMode } = await loadEnv();
      expect(isMockMode).toBe(true);
    });

    it("does NOT trip when URL points at real Supabase Cloud", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdef.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "real-anon-jwt";
      const { isMockMode } = await loadEnv();
      expect(isMockMode).toBe(false);
    });

    it("trips on the client-side NEXT_PUBLIC_MOCK_SUPABASE=1 flag", async () => {
      // Browsers cannot read server-only env vars, so the client bundle
      // needs its own flag. NEXT_PUBLIC_MOCK_SUPABASE mirrors MOCK_SUPABASE
      // for client-side code paths (createSupabaseBrowserClient,
      // RealtimeSubscriptions, etc.) while server-only MOCK_SUPABASE keeps
      // gating proxy.ts / route handlers / RSC.
      process.env.NEXT_PUBLIC_MOCK_SUPABASE = "1";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "real-anon-jwt";
      const { isMockMode } = await loadEnv();
      expect(isMockMode).toBe(true);
    });

    it("does NOT trip on NEXT_PUBLIC_MOCK_SUPABASE when server-side MOCK_SUPABASE is unset and key is real", async () => {
      // Without MOCK_SUPABASE=1, NEXT_PUBLIC_MOCK_SUPABASE=0, and a real
      // anon key, the gate must stay closed so real-mode clients connect
      // to real Supabase.
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "real-anon-jwt";
      const { isMockMode } = await loadEnv();
      expect(isMockMode).toBe(false);
    });
  });

  describe("supabaseEnv URL defaults", () => {
    it("defaults every per-service URL to the canonical `url`", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      const { supabaseEnv } = await loadEnv();
      expect(supabaseEnv.url).toBe("http://127.0.0.1:54321");
      expect(supabaseEnv.gotrueUrl).toBe("http://127.0.0.1:54321");
      expect(supabaseEnv.realtimeUrl).toBe("http://127.0.0.1:54321");
      expect(supabaseEnv.metaUrl).toBe("http://127.0.0.1:54321");
    });

    it("honors per-service overrides when explicitly set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_GOTRUE_URL = "http://gotrue.local:9999";
      process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL = "ws://realtime.local:4000";
      process.env.NEXT_PUBLIC_SUPABASE_META_URL = "http://meta.local:8080";
      const { supabaseEnv } = await loadEnv();
      expect(supabaseEnv.gotrueUrl).toBe("http://gotrue.local:9999");
      expect(supabaseEnv.realtimeUrl).toBe("ws://realtime.local:4000");
      expect(supabaseEnv.metaUrl).toBe("http://meta.local:8080");
      // The canonical `url` is unchanged — gateway default is preserved.
      expect(supabaseEnv.url).toBe("http://127.0.0.1:54321");
    });

    it("falls back to mock-local URL when no env is exported", async () => {
      const { supabaseEnv } = await loadEnv();
      expect(supabaseEnv.url).toBe("http://mock.local");
      expect(supabaseEnv.gotrueUrl).toBe("http://mock.local");
      expect(supabaseEnv.realtimeUrl).toBe("http://mock.local");
      expect(supabaseEnv.metaUrl).toBe("http://mock.local");
    });
  });

  describe("mock-mode short-circuits real-client branches", () => {
    it("preserves isMockMode=true after the new URL fields land", async () => {
      // Regression guard: adding gotrueUrl/realtimeUrl/metaUrl must NOT
      // accidentally flip the mock gate off. The new fields default to `url`
      // and never participate in the gate's predicates.
      process.env.MOCK_SUPABASE = "1";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-replace-me";
      const { isMockMode, supabaseEnv } = await loadEnv();
      expect(isMockMode).toBe(true);
      expect(supabaseEnv.gotrueUrl).toBe(supabaseEnv.url);
      expect(supabaseEnv.realtimeUrl).toBe(supabaseEnv.url);
      expect(supabaseEnv.metaUrl).toBe(supabaseEnv.url);
    });
  });
});
