"use client";

import { LayoutGrid, ListFilter, List as ListIcon, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { NewTaskTrigger } from "./new-task-trigger";

type View = "list" | "board";

interface TasksToolbarProps {
  view: View;
  projects: { id: string; name: string }[];
}

export function TasksToolbar({ view, projects }: TasksToolbarProps) {
  const [current, setCurrent] = useState<View>(view);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="sr-only">Tasks toolbar</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border p-0.5">
            <Link
              href="/tasks?view=list"
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                current === "list"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setCurrent("list")}
            >
              <ListIcon className="size-3.5" />
              List
            </Link>
            <Link
              href="/tasks?view=board"
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                current === "board"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setCurrent("board")}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </Link>
          </div>
          <NewTaskTrigger projects={projects} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search tasks..."
            className="h-9 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
            aria-label="Search tasks"
          />
        </div>
        <Button variant="outline" size="sm">
          <ListFilter />
          Filters
        </Button>
      </div>
    </div>
  );
}
