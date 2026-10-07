// lib/auth/role.ts
// The signed-in user's role, read from their profile (profiles.role —
// Supabase, or the mock store in MOCK_SUPABASE mode). Fails closed: any
// lookup error or unknown value returns null, which means read-only.

import "server-only";
import { isUserRole } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/db/profiles";
import { error as logError } from "@/lib/logger";
import type { UserRole } from "@/lib/types";

export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const profile = await getProfile(userId);
    return isUserRole(profile?.role) ? profile.role : null;
  } catch (e: unknown) {
    logError("auth.role_lookup_failed", { detail: e instanceof Error ? e.message : String(e) });
    return null;
  }
}
