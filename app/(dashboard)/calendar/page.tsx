import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const VIEW_TABS = ["Month", "Week", "Day"] as const;
type ViewTab = (typeof VIEW_TABS)[number];

export default function CalendarPage() {
  const cells = getMonthGrid(YEAR, MONTH);
  const tasksByDay = new Map<string, typeof tasks>();
  tasks.forEach((t) => {
    const key = t.dueDate;
    if (!tasksByDay.has(key)) tasksByDay.set(key, []);
    tasksByDay.get(key)!.push(t);
  });

  const overdue = tasks.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
  ).length;
  const upcoming = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`${MONTH_NAME} ${YEAR} · ${upcoming} deadlines tracked`}
        title={<>The month, <span className="italic text-primary">at a glance</span>.</>}
        description={`${overdue} already overdue — catch those first. Hover any chip to see the assignee.`}
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
            {VIEW_TABS.map((tab, i) => (
              <button
                key={tab}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  i === 0
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />

      <Card className="animate-fade-up opacity-0" style={{ animationDelay: "80ms" }}>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              {MONTH_NAME} {YEAR}
            </CardTitle>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Today: {TODAY.toLocaleString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-xs">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-secondary px-2 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {cells.map((date, idx) => {
              if (!date) {
                return <div key={idx} className="bg-card/30 h-32" aria-hidden />;
              }
              const key = date.toISOString().slice(0, 10);
              const dayTasks = tasksByDay.get(key) ?? [];
              const isToday = date.toDateString() === TODAY.toDateString();
              const hasOverdue = dayTasks.some(
                (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
              );
              return (
                <div
                  key={idx}
                  className={cn(
                    "bg-card p-1.5 h-32 overflow-hidden flex flex-col gap-1 transition-colors",
                    isToday && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "font-display text-[15px] font-normal leading-none tabular-nums",
                        isToday ? "text-primary" : "text-foreground",
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="rounded bg-secondary px-1 text-[10px] font-mono tabular-nums text-muted-foreground">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 3).map((t) => {
                      const overdueItem = t.status !== "done" && new Date(t.dueDate) < new Date();
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight cursor-pointer transition-colors",
                            t.status === "done" && "bg-status-good/10 text-status-good line-through",
                            t.status !== "done" && !overdueItem && "bg-secondary text-foreground hover:bg-primary/10",
                            overdueItem && "bg-status-critical/10 text-status-critical",
                          )}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                  {hasOverdue && (
                    <div className="mt-auto">
                      <Dot tone="critical" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up opacity-0" style={{ animationDelay: "160ms" }}>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Upcoming this month
            </CardTitle>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              next 8
            </span>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {tasks
            .filter((t) => t.status !== "done")
            .slice(0, 8)
            .map((t) => {
              const assignee = findUser(t.assigneeId);
              const project = findProject(t.projectId);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="w-14 shrink-0 flex flex-col items-center justify-center rounded-md bg-secondary/60 py-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {new Date(t.dueDate).toLocaleString("en-US", { month: "short" })}
                    </span>
                    <span className="font-display text-[20px] font-normal leading-none tabular-nums text-foreground">
                      {new Date(t.dueDate).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {project?.name} · {assignee?.name.split(" ").slice(-1)[0]}
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
