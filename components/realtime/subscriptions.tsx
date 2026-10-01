// components/realtime/subscriptions.tsx
// Single client component mounted near root. Subscribes to Supabase Realtime
// postgres_changes for tasks, activity_log, and notifications, and invalidates
// matching TanStack Query caches on every event.
//
// Mock-mode behaviour: in mock mode we still attach channels to the mock
// client (lib/supabase/mock.ts). Every MockFrom mutation broadcasts a
// postgres_changes-shaped payload to those channels, so the invalidators
// fire end-to-end — same payload shape real Supabase would deliver. E2E
// tests rely on this path; production (real Supabase) goes through the
// WebSocket bridge instead.

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

// Tell the realtime client which JWT to attach to every phx_join.
//
// Without this, realtime-js sends only the anon key in the apikey query
// param; the realtime server then stores `realtime.subscription.claims_role =
// 'anon'` for that subscriber. The RLS step in `realtime.apply_rls` runs
// `set_config('role', 'anon', ...)` and `has_column_privilege(anon, ...)`
// returns false — every WAL change gets `subscription_ids = '{}'` and no
// event reaches the WebSocket. The bug only surfaces in real-mode e2e because
// in mock mode the broadcast is synthetic.
//
// `client.auth.getSession()` reads the access_token from the cookie set by
// `@supabase/ssr`. We re-read on every auth-state-change so the JWT is
// fresh after token rotation. We never call `setAuth` in mock mode —
// `lib/supabase/mock.ts` doesn't expose `client.realtime`.
async function bindRealtimeAuth(client: SupabaseClient): Promise<() => void> {
  if (isMockMode) return () => {};
  const { data } = await client.auth.getSession();
  if (data.session?.access_token) {
    void client.realtime.setAuth(data.session.access_token);
  }
  const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      void client.realtime.setAuth(session.access_token);
    }
  });
  return () => sub.subscription.unsubscribe();
}

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
    if (!session) return undefined;

    const client = createSupabaseBrowserClient();
    const cleanups: Array<() => void> = [];
    let cancelled = false;

    // bindRealtimeAuth resolves AFTER `setAuth` has been awaited on the
    // realtime client — only then does `client.realtime.accessTokenValue`
    // become non-null, which is what RealtimeChannel.joinPush() reads
    // when assembling the phx_join payload (RealtimeChannel.js:146-155).
    // If we subscribed first, the realtime client would send phx_join
    // without an access_token, the realtime server would read only the
    // anon key (claims_role=anon), and the apply_rls gate would deny
    // every WAL change → no broadcast.
    void bindRealtimeAuth(client).then((cleanup) => {
      if (cancelled) {
        cleanup();
        return;
      }
      cleanups.push(cleanup);
      cleanups.push(subscribeTasks(qc, client));
      cleanups.push(subscribeActivity(qc, client));
      cleanups.push(subscribeNotifications(qc, client, session.userId));
    });

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [qc, session]);

  return null;
}