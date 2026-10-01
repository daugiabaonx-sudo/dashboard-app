import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { priorityLabel, statusLabel } from "@/lib/semantic";
import type { FeaturedTaskRow } from "@/lib/data";
import type { TaskPriority } from "@/lib/types";

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "primary" | "serious" | "critical"> = {
  low: "neutral",
  medium: "primary",
  high: "serious",
  urgent: "critical",
};

interface FeaturedTasksTableProps {
  rows: FeaturedTaskRow[];
  emptyMessage: string;
}

function daysFromNow(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86400000);
}

export function FeaturedTasksTable({ rows, emptyMessage }: FeaturedTasksTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map(({ task, projectName, assigneeInitials, assigneeColor, assigneeName }) => {
        const days = daysFromNow(task.dueDate);
        const dueTone =
          days < 0 ? "critical" : days <= 3 ? "warning" : "neutral";
        const dueLabel =
          days < 0
            ? `${Math.abs(days)}d overdue`
            : days === 0
              ? "Due today"
              : `${days}d left`;
        return (
          <li
            key={task.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: assigneeColor }}
              title={assigneeName}
            >
              {assigneeInitials}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/tasks/${task.id}`}
                className="block text-[13.5px] font-medium leading-snug tracking-tight hover:text-primary"
              >
                {task.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[11px] text-muted-foreground">
                  {projectName}
                </span>
                <span aria-hidden className="text-[11px] text-muted-foreground">
                  ·
                </span>
                <Badge tone="neutral" size="sm">
                  {statusLabel[task.status]}
                </Badge>
                <Badge tone={PRIORITY_TONE[task.priority]} size="sm">
                  {priorityLabel[task.priority]}
                </Badge>
              </div>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  dueTone === "critical"
                    ? "text-status-critical"
                    : dueTone === "warning"
                      ? "text-status-warning"
                      : "text-muted-foreground",
                )}
              >
                {dueLabel}
              </span>
              <span className="text-[10.5px] text-muted-foreground">
                {formatDate(task.dueDate, "MMM d")}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}