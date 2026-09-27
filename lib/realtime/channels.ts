// lib/realtime/channels.ts
// Channel naming + debounced invalidation. Realtime callbacks must ONLY
// invalidate queries — never mutate the cache directly.

import type { QueryClient } from "@tanstack/react-query";

export const channelNames = {
  tasks: (workspaceId: string) => `tasks:${workspaceId}`,
  activity: (workspaceId: string) => `activity:${workspaceId}`,
  notifications: (userId: string) => `notifications:${userId}`,
} as const;

const DEBOUNCE_MS = 150;

export function makeDebouncedInvalidator(
  qc: QueryClient,
  invalidate: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      invalidate();
      timer = null;
    }, DEBOUNCE_MS);
  };
}
