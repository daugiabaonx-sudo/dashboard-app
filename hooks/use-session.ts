// hooks/use-session.ts
// Client-side session hook.

"use client";

import { useQuery } from "@tanstack/react-query";

export interface SessionView {
  userId: string;
  email: string;
  fullName: string;
}

async function fetchSession(): Promise<SessionView | null> {
  const res = await fetch("/api/session", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as SessionView;
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });
}
