// lib/supabase/env.ts
// Centralized env reading so every consumer agrees on the active mode.

const rawMock = process.env.MOCK_SUPABASE;
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isMockMode =
  rawMock === "1" ||
  rawMock === "true" ||
  !rawUrl ||
  rawUrl.includes("mock") ||
  rawUrl === "http://127.0.0.1:54321" && (rawAnon?.startsWith("mock-") ?? false);

export const supabaseEnv = {
  url: rawUrl ?? "http://mock.local",
  anonKey: rawAnon ?? "mock-anon-key",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "mock-service-role-key",
  activeWorkspaceCookie:
    process.env.ACTIVE_WORKSPACE_COOKIE ?? "sunext.active_workspace",
} as const;

export type SupabaseEnv = typeof supabaseEnv;
