// hooks/use-activity.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Activity } from "@/lib/types";

async function fetchActivity(): Promise<Activity[]> {
  const res = await fetch("/api/activity", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch activity");
  return (await res.json()) as Activity[];
}

export function useActivity() {
  return useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
    staleTime: 60_000,
  });
}
