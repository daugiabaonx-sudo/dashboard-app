// lib/db/stats.ts
// Aggregate stats: KPIs + team workload. Implemented as RPCs in production
// (workspace_kpis + workspace_workload); the mock adapter computes them
// from the in-memory fixtures.
//
// SECURITY NOTE: workspace_kpis and workspace_workload are SECURITY DEFINER
// RPCs (see supabase/migrations/0008_stats.sql) and therefore bypass RLS on
// the underlying tables. Migration 0011_stats_guard.sql adds a server-side
// guard inside each function so that callers who are not members of the
// requested workspace — or who have no auth session at all (auth.uid() is
// NULL, e.g. mock/unauthenticated contexts) — receive an empty result set
// instead of cross-workspace data. Both callers below already handle
// `(data ?? [])` and render zero rows, so an empty result is safe.

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardKpi, TeamWorkload } from "@/lib/types";

export async function getKpis(_workspaceId: string): Promise<DashboardKpi[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("workspace_kpis", {
    workspace_id: _workspaceId,
  });
  if (error) throw new Error(`getKpis: ${error.message}`);
  return (data ?? []) as DashboardKpi[];
}

export async function getTeamWorkload(
  _workspaceId: string,
): Promise<TeamWorkload[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("workspace_workload", {
    workspace_id: _workspaceId,
  });
  if (error) throw new Error(`getTeamWorkload: ${error.message}`);
  return (data ?? []) as TeamWorkload[];
}
