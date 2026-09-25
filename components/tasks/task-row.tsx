"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { findUser, findProject } from "@/lib/data";
import { daysUntil, formatDate } from "@/lib/format";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/lib/semantic";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CalendarDays, MessageSquare, Paperclip, AlertCircle } from "lucide-react";

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

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 transition-colors hover:bg-secondary/50 hover:border-border",
        compact && "py-2",
      )}
    >
      <button
        className="size-4 rounded-[5px] border-2 border-border hover:border-primary transition-colors shrink-0"
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
    </div>
  );
}
