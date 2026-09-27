// hooks/use-team.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/types";

async function fetchTeam(): Promise<User[]> {
  const res = await fetch("/api/team", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch team");
  return (await res.json()) as User[];
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    staleTime: 5 * 60_000,
  });
}
