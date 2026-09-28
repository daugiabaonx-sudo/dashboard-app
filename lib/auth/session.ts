// lib/auth/session.ts
// Server-side session helpers. Reads the Supabase auth user, falls back to
// the mock fixture user when MOCK_SUPABASE=1.

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMockMode, supabaseEnv } from "@/lib/supabase/env";
import {
  getSignedInUserId,
  MOCK_DEFAULT_USER_ID,
  MOCK_DEFAULT_USER,
} from "@/lib/supabase/mock";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export { DEFAULT_WORKSPACE_ID };

export interface Session {
  userId: string;
  email: string;
  fullName: string;
}

export async function getSession(): Promise<Session | null> {
  // Mock mode auto-login: if no one is "signed in" yet, fall back to the
  // default fixture owner so existing Playwright tests keep working
  // without a per-test login. Real Supabase mode always reads the auth user.
  if (isMockMode) {
    const id = getSignedInUserId() ?? MOCK_DEFAULT_USER_ID;
    return {
      userId: id,
      email: MOCK_DEFAULT_USER.email,
      fullName: MOCK_DEFAULT_USER.name,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const userId = data.user.id;
  const meta = (data.user.user_metadata ?? {}) as {
    full_name?: string;
  };
  return {
    userId,
    email: data.user.email ?? "",
    fullName: meta.full_name ?? data.user.email?.split("@")[0] ?? "User",
  };
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function getCurrentWorkspaceId(): Promise<string> {
  const cookieStore = await cookies();
  const explicit = cookieStore.get(supabaseEnv.activeWorkspaceCookie)?.value;
  return explicit || DEFAULT_WORKSPACE_ID;
}

// Mock-mode only — every caller is gated by `isMockMode`, audit-verified at Phase F.
export function getMockSignedInUserId(): string | null {
  return getSignedInUserId() ?? (isMockMode ? MOCK_DEFAULT_USER_ID : null);
}
