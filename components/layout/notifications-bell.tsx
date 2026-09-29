"use client";

// components/layout/notifications-bell.tsx
// Header bell + dropdown. Reads from /api/notifications via TanStack Query
// so realtime invalidations from the notifications channel refresh the
// unread count and list.

import { Bell } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkAllRead } from "@/hooks/use-notifications";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;
  const markAllRead = useMarkAllRead();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications, ${unread} unread`}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-status-critical" />
        )}
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-popover shadow-overlay animate-fade-in"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || unread === 0}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto py-1">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                You’re all caught up.
              </li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex gap-3 px-4 py-3 hover:bg-accent cursor-pointer",
                  !n.read && "bg-primary/5",
                )}
                role="menuitem"
              >
                {!n.read && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
