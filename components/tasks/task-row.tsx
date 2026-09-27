"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { findUser, findProject } from "@/lib/data";
import { daysUntil, formatDate } from "@/lib/format";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/lib/semantic";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CalendarDays, MessageSquare, Paperclip, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteTask, useTasks } from "@/hooks/use-tasks";
import { useSession } from "@/hooks/use-session";

interface Props {
  task: Task;
  compact?: boolean;
}

export function TaskRow({ task, compact }: Props) {
  const assignee = findUser(task.assigneeId);
  const project = findProject(task.projectId);
  const days = daysUntil(task.dueDate);
  const overdue = days < 0 && task.status !== "done";
  const dueTone: "critical" | "warning" | "neutral" =
    overdue || days <= 1
      ? "critical"
      : days <= 3
      ? "warning"
      : "neutral";

  const isDone = task.status === "done";

  const { data: session } = useSession();
  const workspaceId = session?.userId ?? "anon";
  // Prime the cache so optimistic updates land in the same query the page
  // re-uses after router.refresh().
  useTasks(workspaceId);
  const remove = useDeleteTask(workspaceId);

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

  return (
    <div
      data-done={isDone}
      className={cn(
        "group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 transition-colors hover:bg-secondary/50 hover:border-border",
        isDone && "bg-secondary/40 opacity-70",
        compact && "py-2",
      )}
    >
      <button
        type="button"
        aria-pressed={isDone}
        className={cn(
          "size-4 rounded-[5px] border-2 transition-colors shrink-0",
          isDone
            ? "border-status-good bg-status-good/15"
            : "border-border hover:border-primary",
        )}
        aria-label={`Toggle ${task.title}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              task.status === "done" && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </p>
          {task.blocked && (
            <AlertCircle className="size-3.5 text-status-critical shrink-0" />
          )}
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {project && <span>{project.name}</span>}
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium"
              >
                {tag}
              </span>
            ))}
            {task.comments > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="size-3" />
                {task.comments}
              </span>
            )}
            {task.attachments > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Paperclip className="size-3" />
                {task.attachments}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <Badge tone={statusTone[task.status]} size="sm">
          {statusLabel[task.status]}
        </Badge>
        <Badge tone={priorityTone[task.priority]} size="sm">
          {priorityLabel[task.priority]}
        </Badge>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <CalendarDays className="size-3.5 text-muted-foreground" />
        <Badge tone={dueTone} size="sm">
          {overdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : formatDate(task.dueDate, "MMM d")}
        </Badge>
      </div>
      <Avatar color={assignee?.avatarColor} className="size-7 shrink-0">
        <span>{assignee?.initials}</span>
      </Avatar>
      <button
        type="button"
        aria-label={`Delete ${task.title}`}
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-status-critical transition-opacity"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
