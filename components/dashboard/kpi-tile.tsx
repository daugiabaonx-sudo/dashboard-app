import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Folder,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";
import type { DashboardKpi } from "@/lib/types";
import { cn } from "@/lib/cn";

const iconById: Record<string, ComponentType<{ className?: string }>> = {
  "active-projects": Folder,
  "tasks-completed": CheckCircle2,
  "in-progress": ListTodo,
  overdue: AlertTriangle,
  "upcoming-deadlines": Clock,
};

const intentStyle: Record<
  DashboardKpi["intent"],
  { ring: string; text: string; bg: string }
> = {
  neutral: { ring: "", text: "text-foreground", bg: "" },
  good: {
    ring: "ring-status-good/30",
    text: "text-status-good",
    bg: "bg-status-good/8",
  },
  warning: {
    ring: "ring-status-warning/30",
    text: "text-status-warning",
    bg: "bg-status-warning/8",
  },
  critical: {
    ring: "ring-status-critical/30",
    text: "text-status-critical",
    bg: "bg-status-critical/8",
  },
};

export function KpiTile({ kpi }: { kpi: DashboardKpi }) {
  const Icon = iconById[kpi.id] ?? TrendingUp;
  const tone = intentStyle[kpi.intent];
  const Trend =
    kpi.trend === "up"
      ? ArrowUpRight
      : kpi.trend === "down"
      ? ArrowDownRight
      : ArrowRight;
  return (
    <div
      className={cn(
        "group rounded-lg border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated",
        kpi.intent === "critical" && "ring-1 ring-status-critical/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-md",
            tone.bg || "bg-secondary",
            tone.text || "text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        {kpi.intent === "critical" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-status-critical/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-critical">
            Action needed
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
          {kpi.value}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Trend
          className={cn(
            "size-3.5",
            kpi.trend === "up" && kpi.intent !== "critical"
              ? "text-status-good"
              : kpi.trend === "up" && kpi.intent === "critical"
              ? "text-status-critical"
              : "text-muted-foreground",
          )}
        />
        <span>{kpi.delta > 0 ? `+${kpi.delta}` : kpi.delta}</span>
        <span className="text-muted-foreground/70">· {kpi.deltaLabel}</span>
      </div>
    </div>
  );
}
