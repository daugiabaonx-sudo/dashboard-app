import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BlockerRow } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { priorityLabel } from "@/lib/semantic";
import type { TaskPriority } from "@/lib/types";

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "primary" | "serious" | "critical"> = {
  low: "neutral",
  medium: "primary",
  high: "serious",
  urgent: "critical",
};

interface BlockersTableProps {
  rows: BlockerRow[];
  emptyMessage: string;
}

export function BlockersTable({ rows, emptyMessage }: BlockersTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map(({ task, projectName, assigneeName, dueRelative }) => (
        <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-status-critical/10 text-status-critical"
          >
            <AlertOctagon className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <Link
              href={`/tasks/${task.id}`}
              className="block text-[13.5px] font-medium leading-snug tracking-tight hover:text-primary"
            >
              {task.title}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="truncate">{projectName}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{assigneeName}</span>
            </div>
            {task.blockerNote && (
              <p className="text-[12px] leading-snug text-muted-foreground line-clamp-1">
                {task.blockerNote}
              </p>
            )}
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            <Badge tone={PRIORITY_TONE[task.priority]} size="sm">
              {priorityLabel[task.priority]}
            </Badge>
            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
              {dueRelative} · {formatDate(task.dueDate, "MMM d")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}