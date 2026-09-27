// lib/db/stats.ts
// Aggregate stats: KPIs + team workload. Implemented as RPCs in production
// (workspace_kpis + workspace_workload); the mock adapter computes them
// from the in-memory fixtures.

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
