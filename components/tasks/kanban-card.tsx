// components/tasks/kanban-card.tsx
// Client wrapper around a single kanban card. Adds a status select that
// calls useSetTaskStatus (optimistic) and a delete button. Visual structure
// is kept identical to the previous server-rendered card so Playwright
// selectors still resolve.

"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useDeleteTask, useSetTaskStatus, useTasks } from "@/hooks/use-tasks";
import { useSession } from "@/hooks/use-session";
import { priorityLabel, priorityTone, statusLabel } from "@/lib/semantic";
import { cn } from "@/lib/cn";
import type { Task, TaskStatus } from "@/lib/types";

const STATUS_VALUES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

interface KanbanCardProps {
  task: Task;
}

export function KanbanCard({ task }: KanbanCardProps) {
  const { data: session } = useSession();
  const workspaceId = session?.userId ?? "anon";
  // useTasks keeps the cache warm so optimistic updates land in the same
  // list the rest of the page reads from.
  useTasks(workspaceId);
  const setStatus = useSetTaskStatus(workspaceId);
  const remove = useDeleteTask(workspaceId);

  function onChangeStatus(next: TaskStatus) {
    if (next === task.status) return;
    setStatus.mutate(
      { id: task.id, status: next },
      {
        onError: () => toast.error("Failed to update status"),
        onSuccess: () => toast.success(`Moved to ${statusLabel[next]}`),
      },
    );
  }

  function onDelete() {
    const ok = window.confirm(`Delete "${task.title}"? This can't be undone.`);
    if (!ok) return;
    remove.mutate(
      { id: task.id },
      {
        onError: () => toast.error("Failed to delete task"),
        onSuccess: () => toast.success("Task deleted"),
      },
    );
  }

  const done = task.status === "done";

  return (
    <div
      data-task-id={task.id}
      className={cn(
        "rounded-md border bg-card p-3 shadow-soft hover:shadow-elevated transition-shadow group/card",
        done
          ? "border-border/60 bg-secondary/40 opacity-70"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            done && "line-through decoration-muted-foreground/60",
          )}
        >
          {task.title}
        </p>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={onDelete}
          className="opacity-0 group-hover/card:opacity-100 text-muted-foreground hover:text-status-critical transition-opacity"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={priorityTone[task.priority]} size="sm">
          {priorityLabel[task.priority]}
        </Badge>
        {task.blocked && (
          <Badge tone="critical" size="sm">
            Blocked
          </Badge>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{task.estimatedHours}h</span>
        <span className="tabular-nums">{task.progress}%</span>
      </div>
      <div className="mt-2">
        <label className="sr-only" htmlFor={`status-${task.id}`}>
          Status
        </label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          onChange={(e) => onChangeStatus(e.target.value as TaskStatus)}
          className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
