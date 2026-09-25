import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tasks } from "@/lib/data";
import { priorityLabel, priorityTone, statusLabel } from "@/lib/semantic";
import { TaskRow } from "./task-row";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const COLUMNS: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export function KanbanBoard() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 items-start">
      {COLUMNS.map((status) => {
        const items = tasks.filter((t) => t.status === status);
        return (
          <Card
            key={status}
            className="bg-card/60 min-h-[260px] border-r border-border/40 last:border-r-0"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{statusLabel[status]}</CardTitle>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                  {items.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Nothing here
                </div>
              ) : (
                items.map((t) => {
                  const done = t.status === "done";
                  return (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-md border bg-card p-3 shadow-soft hover:shadow-elevated transition-shadow",
                      done
                        ? "border-border/60 bg-secondary/40 opacity-70"
                        : "border-border",
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug",
                        done && "line-through decoration-muted-foreground/60",
                      )}
                    >
                      {t.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={priorityTone[t.priority]} size="sm">
                        {priorityLabel[t.priority]}
                      </Badge>
                      {t.blocked && (
                        <Badge tone="critical" size="sm">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t.estimatedHours}h</span>
                      <span className="tabular-nums">{t.progress}%</span>
                    </div>
                  </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
