"use client";

import {
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { users } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NewTaskTrigger } from "@/components/tasks/new-task-trigger";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { SignOutMenu } from "@/components/layout/sign-out-menu";
import { useProjects } from "@/hooks/use-projects";

const me = users[0];
if (!me) {
  throw new Error("Seed data missing primary user");
}

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: projects } = useProjects();
  const projectOptions = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

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
        <span className="hidden sm:inline-flex">
          <NewTaskTrigger
            size="sm"
            projects={projectOptions}
            label="New task"
          >
            <Plus />
            <span>New task</span>
          </NewTaskTrigger>
        </span>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="block dark:hidden" />
        </Button>

        <NotificationsBell />

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
          <SignOutMenu />
        </div>
      </div>
    </header>
  );
}
