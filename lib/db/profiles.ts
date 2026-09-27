// lib/db/profiles.ts
// Profile queries. Currently read-only — profile updates happen via Supabase Auth.

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  avatar_color: string;
  department: string;
  role: string;
  capacity_hours: number;
  joined_at: string;
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role as User["role"],
    avatarColor: row.avatar_color,
    initials: row.initials,
    department: row.department,
    joinedAt: row.joined_at,
    capacityHours: row.capacity_hours,
  };
}

export async function listProfiles(): Promise<User[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw new Error(`listProfiles: ${error.message}`);
  return (data ?? []).map((r) => toUser(r as unknown as ProfileRow));
}

export async function getProfile(id: string): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id);
  if (error) throw new Error(`getProfile: ${error.message}`);
  const rows = (data ?? []) as unknown as ProfileRow[];
  const row = rows[0];
  return row ? toUser(row) : null;
}
