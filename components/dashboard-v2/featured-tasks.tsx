// v2 Featured Tasks card — slim table with columns for Project / Task /
// Priority / Progress / Deadline / Status.

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/dashboard-v2/priority-badge";
import type { DashboardFeaturedRow } from "@/lib/dashboard-data";
import { cn } from "@/lib/cn";
import { formatDays } from "@/lib/format";

interface FeaturedTasksLabels {
  title: string;
  subtitle: string;
  viewAll: string;
  employee: string;
  project: string;
  task: string;
  priority: string;
  progress: string;
  deadline: string;
  empty: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  today: string;
  daysOverduePattern: string;
  daysLeftPattern: string;
}

interface FeaturedTasksProps {
  rows: DashboardFeaturedRow[];
  labels: FeaturedTasksLabels;
  titleSlot?: ReactNode;
}

function daysFromNow(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function priorityLabel(
  p: "high" | "medium" | "low",
  labels: Pick<FeaturedTasksLabels, "priorityHigh" | "priorityMedium" | "priorityLow">,
): string {
  if (p === "high") return labels.priorityHigh;
  if (p === "medium") return labels.priorityMedium;
  return labels.priorityLow;
}

export function FeaturedTasks({ rows, labels, titleSlot }: FeaturedTasksProps) {
  return (
    <Card className="animate-fade-up opacity-0" style={{ animationDelay: "120ms" }}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              {titleSlot ?? labels.title}
            </CardTitle>
            <CardDescription className="mt-1">{labels.subtitle}</CardDescription>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {labels.viewAll} →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
            {labels.empty}
          </div>
        ) : (
          <>
            {/* Desktop + tablet: full table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{labels.employee}</th>
                  <th className="py-2 pr-3 font-medium">{labels.project}</th>
                  <th className="py-2 pr-3 font-medium">{labels.task}</th>
                  <th className="py-2 pr-3 font-medium">{labels.priority}</th>
                  <th className="py-2 pr-3 font-medium">{labels.progress}</th>
                  <th className="py-2 pr-3 font-medium">{labels.deadline}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const days = daysFromNow(row.dueDate);
                  const dueTone =
                    days < 0
                      ? "text-status-critical"
                      : days <= 3
                        ? "text-status-warning"
                        : "text-muted-foreground";
                  return (
                    <tr key={row.id} className="group">
                      <td className="py-3 pr-3">
                        <span
                          aria-hidden
                          className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: row.ownerColor }}
                        >
                          {row.ownerInitials}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate py-3 pr-3 text-muted-foreground">
                        {row.projectName}
                      </td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/tasks?focus=${row.id}`}
                          prefetch={false}
                          className="font-medium tracking-tight hover:text-primary"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <PriorityBadge
                          priority={row.priority}
                          label={priorityLabel(row.priority, labels)}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-brand"
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {row.progress}%
                          </span>
                        </div>
                      </td>
                      <td className={cn("py-3 pr-3 font-mono text-[11px] tabular-nums", dueTone)}>
                        {formatDays(days, labels)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile: stacked rows */}
            <ul className="space-y-3 md:hidden">
              {rows.map((row) => {
                const days = daysFromNow(row.dueDate);
                const dueTone =
                  days < 0
                    ? "text-status-critical"
                    : days <= 3
                      ? "text-status-warning"
                      : "text-muted-foreground";
                return (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: row.ownerColor }}
                    >
                      {row.ownerInitials}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Link
                        href={`/tasks?focus=${row.id}`}
                        prefetch={false}
                        className="block text-[13.5px] font-medium leading-snug tracking-tight hover:text-primary"
                      >
                        {row.title}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.projectName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <PriorityBadge
                          priority={row.priority}
                          label={priorityLabel(row.priority, labels)}
                        />
                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-brand"
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {row.progress}%
                          </span>
                        </div>
                      </div>
                      <p className={cn("font-mono text-[11px] tabular-nums", dueTone)}>
                        {formatDays(days, labels)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}