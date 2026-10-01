// lib/supabase/env.ts
// Centralized env reading so every consumer agrees on the active mode.

// MOCK_SUPABASE — server-side flag (proxy.ts, RSC, route handlers).
const rawMock = process.env.MOCK_SUPABASE;
// NEXT_PUBLIC_MOCK_SUPABASE — client-side mirror of MOCK_SUPABASE. Browsers
// can't read server-only env vars, so the client must opt into mock mode
// explicitly via this NEXT_PUBLIC_-prefixed flag. The two stay in sync via
// the .env files (one line, same value).
const rawPublicMock = process.env.NEXT_PUBLIC_MOCK_SUPABASE;
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rawGotrueUrl = process.env.NEXT_PUBLIC_SUPABASE_GOTRUE_URL;
const rawRealtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL;
const rawMetaUrl = process.env.NEXT_PUBLIC_SUPABASE_META_URL;

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
const normalizedPublicMock = rawPublicMock?.toLowerCase();
const explicitMock =
  normalizedMock === "1" ||
  normalizedMock === "true" ||
  normalizedMock === "yes";
const publicMock =
  normalizedPublicMock === "1" ||
  normalizedPublicMock === "true" ||
  normalizedPublicMock === "yes";

// isMockMode is read by both server (proxy.ts, route handlers) and client
// (createSupabaseBrowserClient, RealtimeSubscriptions). Server uses rawMock;
// client uses rawPublicMock because server-only env vars are not inlined
// into the browser bundle. Both signals feed the same boolean.
export const isMockMode =
  explicitMock || publicMock || (urlIsLocalMock && keyIsMock);

export const supabaseEnv = {
  url,
  anonKey,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "mock-service-role-key",
  activeWorkspaceCookie:
    process.env.ACTIVE_WORKSPACE_COOKIE ?? "sunext.active_workspace",
  // Per-service URLs. Default to `url` so the gateway case (single Cloud-
  // Supabase-compatible URL on :54321) is the happy path with no caller
  // changes — the dashboard's @supabase/ssr client derives the realtime
  // WebSocket endpoint from `url` and works unchanged through the gateway.
  // Callers that want to talk to a specific service can override here.
  gotrueUrl: rawGotrueUrl ?? url,
  realtimeUrl: rawRealtimeUrl ?? url,
  metaUrl: rawMetaUrl ?? url,
} as const;

export type SupabaseEnv = typeof supabaseEnv;

