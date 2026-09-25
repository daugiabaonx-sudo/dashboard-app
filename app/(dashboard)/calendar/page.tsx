import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tasks, findUser, findProject } from "@/lib/data";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/lib/semantic";
import { cn } from "@/lib/cn";

const TODAY = new Date();
const YEAR = TODAY.getFullYear();
const MONTH = TODAY.getMonth();
const MONTH_NAME = TODAY.toLocaleString("en-US", { month: "long" });

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const cells = getMonthGrid(YEAR, MONTH);
  const tasksByDay = new Map<string, typeof tasks>();
  tasks.forEach((t) => {
    const key = t.dueDate;
    if (!tasksByDay.has(key)) tasksByDay.set(key, []);
    tasksByDay.get(key)!.push(t);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MONTH_NAME} {YEAR} · {tasks.length} deadlines tracked
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <button className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Month
          </button>
          <button className="rounded bg-secondary px-2.5 py-1 text-xs font-medium">
            Week
          </button>
          <button className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Day
          </button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{MONTH_NAME} {YEAR}</CardTitle>
          <CardDescription>Click any task to open its detail</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="bg-secondary px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={idx} className="bg-card/30 h-28" />;
              }
              const key = date.toISOString().slice(0, 10);
              const dayTasks = tasksByDay.get(key) ?? [];
              const isToday = date.toDateString() === TODAY.toDateString();
              return (
                <div
                  key={idx}
                  className={cn(
                    "bg-card p-1.5 h-28 overflow-hidden",
                    isToday && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <div className="flex items-center justify-between text-[11px] font-medium tabular-nums">
                    <span className={cn(isToday && "text-primary")}>
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="rounded bg-secondary px-1 text-[10px] font-semibold">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                          t.status === "done"
                            ? "bg-status-good/10 text-status-good line-through"
                            : "bg-secondary",
                        )}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming this month</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {tasks
            .filter((t) => t.status !== "done")
            .slice(0, 8)
            .map((t) => {
              const assignee = findUser(t.assigneeId);
              const project = findProject(t.projectId);
              return (
                <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-16 shrink-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {new Date(t.dueDate).toLocaleString("en-US", { month: "short" })}
                    </p>
                    <p className="text-lg font-semibold tabular-nums leading-none">
                      {new Date(t.dueDate).getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {project?.name} · {assignee?.name.split(" ")[0]}
                    </p>
                  </div>
                  <Badge tone={priorityTone[t.priority]} size="sm">
                    {priorityLabel[t.priority]}
                  </Badge>
                  <Badge tone={statusTone[t.status]} size="sm">
                    {statusLabel[t.status]}
                  </Badge>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
