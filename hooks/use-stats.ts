// hooks/use-stats.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardKpi, TeamWorkload } from "@/lib/types";

async function fetchKpis(): Promise<DashboardKpi[]> {
  const res = await fetch("/api/stats/kpis", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch KPIs");
  return (await res.json()) as DashboardKpi[];
}

async function fetchWorkload(): Promise<TeamWorkload[]> {
  const res = await fetch("/api/stats/workload", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch workload");
  return (await res.json()) as TeamWorkload[];
}

export function useKpis() {
  return useQuery({
    queryKey: ["stats", "kpis"],
    queryFn: fetchKpis,
    staleTime: 60_000,
  });
}

export function useWorkload() {
  return useQuery({
    queryKey: ["stats", "workload"],
    queryFn: fetchWorkload,
    staleTime: 60_000,
  });
}
