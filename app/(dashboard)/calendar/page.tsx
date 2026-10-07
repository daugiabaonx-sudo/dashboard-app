// "Lịch" — month grid of Microsoft Planner task deadlines (Vietnam days,
// Monday-first) and the upcoming list. Model: lib/sx-calendar.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { JumpToTodayButton } from "@/components/calendar/jump-to-today-button";
import { buildSxCalendar, type SxCalendarTask } from "@/lib/sx-calendar";
import { vnTodayKey } from "@/lib/sx-dates";
import type { SxPriority, SxStatus } from "@/lib/sx-dashboard";
import { getSxViewDataset } from "@/lib/sx-view-dataset";
import { interpolate, makeTranslator, getRequestLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Lịch · SUNEXT Dashboard" };

type Tone = "neutral" | "primary" | "good" | "warning" | "serious" | "critical";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MAX_PER_DAY = 3;

const STATUS: Record<SxStatus, { label: string; tone: Tone }> = {
  completed: { label: "Hoàn thành", tone: "good" },
  in_progress: { label: "Đang làm", tone: "primary" },
  not_started: { label: "Chưa bắt đầu", tone: "neutral" },
  overdue: { label: "Quá hạn", tone: "critical" },
  blocked: { label: "Bị chặn", tone: "serious" },
};

const PRIORITY: Record<SxPriority, { label: string; tone: Tone }> = {
  high: { label: "Cao", tone: "serious" },
  medium: { label: "Trung bình", tone: "primary" },
  low: { label: "Thấp", tone: "neutral" },
};

const taskHref = (id: string) => `/tasks?focus=${encodeURIComponent(id)}`;

function DayTask({ task, label }: { task: SxCalendarTask; label: string }) {
  const done = task.status === "completed";
  return (
    <Link
      href={taskHref(task.id)}
      aria-label={label}
      title={`${task.title} · ${task.employeeName}`}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        done && "bg-status-good/10 text-status-good line-through",
        !done && !task.overdue && "bg-secondary text-foreground hover:bg-primary/10",
        task.overdue && "bg-status-critical/10 text-status-critical",
      )}
    >
      {task.title}
    </Link>
  );
}

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const locale = getRequestLocale(() => cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const { t } = makeTranslator(locale);
  const openTaskPattern = t("table.openTask");

  const dataset = await getSxViewDataset();
  const todayKey = vnTodayKey();
  const cal = buildSxCalendar(dataset, todayKey);

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`Tháng ${cal.month}/${cal.year} · ${cal.openCount} deadline đang theo dõi`}
        title="Lịch công việc"
        description={
          dataset.sourceNote ??
          `${cal.overdueCount} công việc đã trễ hạn — xử lý trước. Dữ liệu từ Microsoft Planner; rê chuột lên từng công việc để xem người phụ trách.`
        }
        actions={null}
      />

      <Card className="animate-fade-up opacity-0" style={{ animationDelay: "80ms" }}>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              Tháng {cal.month} {cal.year}
            </CardTitle>
            <JumpToTodayButton targetId="cal-today" todayLabel={`${todayKey.slice(8, 10)}/${todayKey.slice(5, 7)}`} />
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
            {cal.cells.map((cell, idx) => {
              if (!cell) return <div key={idx} className="bg-card/30 h-32" aria-hidden />;
              return (
                <div
                  key={cell.key}
                  id={cell.isToday ? "cal-today" : undefined}
                  className={cn(
                    "bg-card p-1.5 h-32 overflow-hidden flex flex-col gap-1 transition-colors scroll-mt-20",
                    cell.isToday && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "font-display text-[15px] font-normal leading-none tabular-nums",
                        cell.isToday ? "text-primary" : "text-foreground",
                      )}
                    >
                      {cell.day}
                    </span>
                    {cell.tasks.length > 0 && (
                      <span className="rounded bg-secondary px-1 text-[10px] font-mono tabular-nums text-muted-foreground">
                        {cell.tasks.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {cell.tasks.slice(0, MAX_PER_DAY).map((task) => (
                      <DayTask key={task.id} task={task} label={interpolate(openTaskPattern, { title: task.title })} />
                    ))}
                    {cell.tasks.length > MAX_PER_DAY && (
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground truncate whitespace-nowrap">
                        +{cell.tasks.length - MAX_PER_DAY} việc khác
                      </span>
                    )}
                  </div>
                  {cell.hasOverdue && (
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
            <CardTitle className="font-display text-xl font-normal tracking-tight">Sắp đến hạn</CardTitle>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {cal.upcoming.length} việc gần nhất
            </span>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {cal.upcoming.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">Không có công việc nào sắp đến hạn.</p>
          )}
          {cal.upcoming.map((task) => (
            <Link
              key={task.id}
              href={taskHref(task.id)}
              className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-secondary/30 rounded-md"
            >
              <div className="w-14 shrink-0 flex flex-col items-center justify-center rounded-md bg-secondary/60 py-1.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider tabular-nums whitespace-nowrap text-muted-foreground">
                  Th{Number(task.deadline.slice(5, 7))}
                </span>
                <span className="font-display text-[20px] font-normal leading-none tabular-nums text-foreground">
                  {Number(task.deadline.slice(8, 10))}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  {task.projectName} · {task.employeeName}
                </p>
              </div>
              <Badge tone={PRIORITY[task.priority].tone} size="sm">
                {PRIORITY[task.priority].label}
              </Badge>
              <Badge tone={STATUS[task.status].tone} size="sm">
                {STATUS[task.status].label}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
