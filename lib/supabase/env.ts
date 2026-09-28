// lib/supabase/env.ts
// Centralized env reading so every consumer agrees on the active mode.

const rawMock = process.env.MOCK_SUPABASE;
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mock-mode has two on-ramps:
//   1. Explicit: MOCK_SUPABASE (server-side only) is "1"/"true"/"yes".
//      Used by proxy.ts, RSC, and route handlers that read the real process env.
//   2. Implicit: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
//      resolve to the placeholder values shipped in .env.example. Next.js
//      inlines NEXT_PUBLIC_* into the client bundle, so the client-side gate
//      (used by createSupabaseBrowserClient, RealtimeSubscriptions, etc.) is
//      driven by these without needing MOCK_SUPABASE to be NEXT_PUBLIC_*.
// Real Supabase Cloud (https://*.supabase.co + real anon key) trips neither.
const url = rawUrl ?? "http://mock.local";
const anonKey = rawAnon ?? "mock-anon-key";
const urlIsLocalMock =
  url === "http://127.0.0.1:54321" || url === "http://mock.local";
const keyIsMock =
  anonKey === "mock-anon-key" || anonKey === "mock-anon-key-replace-me";
const normalizedMock = rawMock?.toLowerCase();
const explicitMock =
  normalizedMock === "1" ||
  normalizedMock === "true" ||
  normalizedMock === "yes";

export const isMockMode = explicitMock || (urlIsLocalMock && keyIsMock);

export const supabaseEnv = {
  url,
  anonKey,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "mock-service-role-key",
  activeWorkspaceCookie:
    process.env.ACTIVE_WORKSPACE_COOKIE ?? "sunext.active_workspace",
} as const;

export type SupabaseEnv = typeof supabaseEnv;
