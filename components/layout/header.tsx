"use client";

import {
  Bell,
  Check,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { notifications, users } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const me = users[0];
if (!me) {
  throw new Error("Seed data missing primary user");
}

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-14 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:top-0 lg:px-8">
      <div className="lg:hidden w-14" />

      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search projects, tasks, people..."
          className={cn(
            "h-9 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm",
            "placeholder:text-muted-foreground/70",
            "focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
          )}
          aria-label="Search"
        />
        <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground md:inline">
          ⌘ K
        </kbd>
      </div>

      <div className="flex items-center gap-1">
        <Button size="sm" className="hidden sm:inline-flex">
          <Plus />
          <span>New task</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="block dark:hidden" />
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications, ${unread} unread`}
            onClick={() => setNotifOpen((v) => !v)}
            className="relative"
          >
            <Bell />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-status-critical" />
            )}
          </Button>
          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-popover shadow-overlay animate-fade-in"
              role="menu"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                <button className="text-xs text-muted-foreground hover:text-foreground">
                  Mark all read
                </button>
              </div>
              <ul className="max-h-96 overflow-y-auto py-1">
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

        <div className="ml-1 flex items-center gap-2 pl-2 border-l border-border h-9">
          <Avatar color={me.avatarColor} className="size-7">
            <span>{me.initials}</span>
          </Avatar>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-xs font-medium">{me.name}</span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {me.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
