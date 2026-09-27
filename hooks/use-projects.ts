// hooks/use-projects.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Project } from "@/lib/types";

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return (await res.json()) as Project[];
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}
