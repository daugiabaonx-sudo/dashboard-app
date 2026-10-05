// v2 Status Donut card — composes the existing `StatusDonut` chart with a
// custom legend, framed in a card that carries a subtle brand-radial backdrop
// so the donut reads as the visual focal point of the right column.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDonut } from "@/components/dashboard/status-donut";
import type { DashboardDonut } from "@/lib/dashboard-data";
import type { TaskStatus as TaskStatusType } from "@/lib/types";

const STATUS_COLOR: Record<TaskStatusType, string> = {
  done: "var(--status-good)",
  in_review: "var(--status-warning)",
  in_progress: "var(--primary)",
  todo: "var(--status-neutral)",
  backlog: "var(--status-neutral-strong)",
};

interface StatusDonutCardLabels {
  title: string;
  subtitle: string;
  total: string;
  done: string;
  inReview: string;
  inProgress: string;
  todo: string;
  backlog: string;
}

interface StatusDonutCardProps {
  donut: DashboardDonut;
  labels: StatusDonutCardLabels;
}

const LEGEND_BY_STATUS: Record<TaskStatusType, keyof StatusDonutCardLabels> = {
  done: "done",
  in_review: "inReview",
  in_progress: "inProgress",
  todo: "todo",
  backlog: "backlog",
};

export function StatusDonutCard({ donut, labels }: StatusDonutCardProps) {
  const slices = donut.slices.map((s) => ({
    status: s.status,
    label: s.label ?? labels[LEGEND_BY_STATUS[s.status]],
    count: s.value,
  }));

  return (
    <Card
      className="glass-card relative overflow-hidden animate-fade-up opacity-0"
      style={{ animationDelay: "160ms" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-donut-radial" aria-hidden />
      <CardHeader className="relative">
        <CardTitle className="font-display text-xl font-normal tracking-tight">
          {labels.title}
        </CardTitle>
        <CardDescription className="mt-1">{labels.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <StatusDonut
          slices={slices}
          total={donut.total}
          withAmounts="both"
          centerLabel={labels.total}
        />
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-4 text-[11.5px]">
          {donut.slices.map((slice) => (
            <li key={slice.status} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-muted-foreground">
                {slice.label ?? labels[LEGEND_BY_STATUS[slice.status]]}
              </span>
              <span className="ml-auto font-mono tabular-nums text-foreground">
                {slice.value}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}