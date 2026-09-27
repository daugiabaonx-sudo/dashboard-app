// lib/supabase/server.ts
// Server-side Supabase client. Reads/writes cookies via next/headers.
// Switches between real Supabase and the in-memory mock based on env.

import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMockMode, supabaseEnv } from "./env";
import { mockClient } from "./mock";

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (isMockMode) {
    return mockClient;
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Read-only context (e.g. RSC); ignore — middleware will refresh.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // ignore
        }
      },
    },
  });
}

// Service-role client (server-only) — bypasses RLS. Use ONLY for trusted
// admin operations (seed scripts, cross-workspace migrations). NEVER expose
// to the client.
export function createSupabaseServiceClient(): SupabaseClient {
  if (isMockMode) return mockClient;
  return createClient(supabaseEnv.url, supabaseEnv.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
