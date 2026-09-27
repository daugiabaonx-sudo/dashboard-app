// components/tasks/kanban-board.tsx
// Kanban view for tasks. Reads from lib/data via the parent (server) and
// renders one KanbanCard per task. The card is a client component that
// wires status change + delete to /api/tasks.

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { statusLabel } from "@/lib/semantic";
import type { Task, TaskStatus } from "@/lib/types";
import { KanbanCard } from "./kanban-card";

const COLUMNS: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

interface KanbanBoardProps {
  tasks: Task[];
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
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
                items.map((t) => <KanbanCard key={t.id} task={t} />)
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
