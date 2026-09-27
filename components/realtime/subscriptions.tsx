// components/realtime/subscriptions.tsx
// Single client component mounted near root. Subscribes to Supabase Realtime
// postgres_changes for tasks, activity_log, and notifications, and invalidates
// matching TanStack Query caches on every event.
//
// Mock-mode behaviour: createSupabaseBrowserClient() returns an inert stub
// (lib/supabase/mock.ts), so no realtime socket is opened. The component is
// a no-op there — invalidation already happens through the existing REST
// mutations and re-fetches.

"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/supabase/env";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { channelNames, makeDebouncedInvalidator } from "@/lib/realtime/channels";
import { useSession } from "@/hooks/use-session";

type QueryClient = ReturnType<typeof useQueryClient>;

function subscribeTasks(qc: QueryClient, client: SupabaseClient): () => void {
  const invalidate = makeDebouncedInvalidator(qc, () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  });
  const channel = client
    .channel(channelNames.tasks(DEFAULT_WORKSPACE_ID))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      invalidate,
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

function subscribeActivity(qc: QueryClient, client: SupabaseClient): () => void {
  const invalidate = makeDebouncedInvalidator(qc, () => {
    qc.invalidateQueries({ queryKey: ["activity"] });
  });
  const channel = client
    .channel(channelNames.activity(DEFAULT_WORKSPACE_ID))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "activity_log" },
      invalidate,
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

function subscribeNotifications(
  qc: QueryClient,
  client: SupabaseClient,
  userId: string,
): () => void {
  const invalidate = makeDebouncedInvalidator(qc, () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
  });
  const channel = client
    .channel(channelNames.notifications(userId))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      invalidate,
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function RealtimeSubscriptions(): null {
  const qc = useQueryClient();
  const { data: session } = useSession();

  useEffect(() => {
    if (isMockMode) return undefined;
    if (!session) return undefined;

    const client = createSupabaseBrowserClient();
    const cleanups = [
      subscribeTasks(qc, client),
      subscribeActivity(qc, client),
      subscribeNotifications(qc, client, session.userId),
    ];

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [qc, session]);

  return null;
}