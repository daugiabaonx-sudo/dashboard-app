// lib/db/activity.ts
// Activity log queries.

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Activity } from "@/lib/types";

interface ActivityRow {
  id: string;
  workspace_id: string;
  actor_id: string;
  type: string;
  target_type: string;
  target_id: string;
  target_title: string;
  message: string;
  created_at: string;
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    actorId: row.actor_id,
    type: row.type as Activity["type"],
    targetType: row.target_type as Activity["targetType"],
    targetId: row.target_id,
    targetTitle: row.target_title,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function listRecentActivity(limit = 12): Promise<Activity[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRecentActivity: ${error.message}`);
  return (data ?? []).map((r) => toActivity(r as unknown as ActivityRow));
}
