"use client";

// components/notifications/notifications-list.tsx
// Full-width stream of every notification in /api/notifications. Mirrors the
// header bell's body but rendered inline on /notifications so the user can
// review history without opening the popover.

import { useNotifications, useMarkAllRead } from "@/hooks/use-notifications";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NotificationsList() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-end justify-between gap-3">
          <div>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Stream
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {unread > 0
                ? `${unread} unread of ${notifications.length}`
                : `${notifications.length} notifications`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unread === 0}
          >
            Mark all read
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            You’re all caught up.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex gap-4 py-4 first:pt-0 last:pb-0 transition-colors",
                  !n.read && "bg-primary/[0.03] -mx-4 px-4 rounded-md",
                )}
              >
                {!n.read && (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {n.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}