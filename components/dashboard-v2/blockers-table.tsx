// v2 Blockers card — full-width table using the v2 row shape.

import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/dashboard-v2/priority-badge";
import type { DashboardBlockerRow } from "@/lib/dashboard-data";

interface BlockersLabels {
  title: string;
  subtitle: string;
  viewAll: string;
  empty: string;
  severity: string;
  days: string;
}

interface BlockersTableProps {
  rows: DashboardBlockerRow[];
  labels: BlockersLabels;
}

export function BlockersTable({ rows, labels }: BlockersTableProps) {
  return (
    <Card className="animate-fade-up opacity-0" style={{ animationDelay: "200ms" }}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-xl font-normal tracking-tight">
              {labels.title}
            </CardTitle>
            <CardDescription className="mt-1">{labels.subtitle}</CardDescription>
          </div>
          <Link
            href="/tasks?filter=blocked"
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
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-status-critical/10 text-status-critical"
                >
                  <AlertOctagon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={`/tasks/${row.id}`}
                    prefetch={false}
                    className="block text-[13.5px] font-medium leading-snug tracking-tight hover:text-primary"
                  >
                    {row.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{row.taskProject}</span>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1">
                      <span
                        aria-hidden
                        className="flex size-4 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                        style={{ backgroundColor: row.assigneeColor }}
                      >
                        {row.assigneeInitials}
                      </span>
                      <span aria-hidden>·</span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {row.daysStuck} {labels.days}
                    </span>
                  </div>
                </div>
                <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end sm:gap-1">
                  <PriorityBadge
                    priority={row.severity}
                    label={`${labels.severity}: ${row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}