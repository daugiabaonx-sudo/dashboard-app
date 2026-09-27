// lib/supabase/client.ts
// Browser-side Supabase client. Used by Client Components that need direct
// access (e.g. Realtime subscriptions from useRealtimeInvalidator).

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMockMode, supabaseEnv } from "./env";
import { mockClient } from "./mock";

let cached: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (isMockMode) return mockClient;
  if (cached) return cached;
  cached = createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
  return cached;
}
