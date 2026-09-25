import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardKpi } from "@/lib/types";
import { cn } from "@/lib/cn";

interface KpiTileProps {
  kpi: DashboardKpi;
  href?: string;
  icon?: ReactNode;
  delay?: number;
}

const intentMap = {
  neutral: {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    chipBg: "bg-secondary",
  },
  good: {
    dot: "bg-status-good",
    text: "text-status-good",
    chipBg: "bg-status-good/10",
  },
  warning: {
    dot: "bg-status-warning",
    text: "text-status-warning",
    chipBg: "bg-status-warning/10",
  },
  critical: {
    dot: "bg-status-critical",
    text: "text-status-critical",
    chipBg: "bg-status-critical/10",
  },
} as const;

export function KpiTile({ kpi, href, icon, delay = 0 }: KpiTileProps) {
  const intent = intentMap[kpi.intent];
  const TrendIcon =
    kpi.trend === "up" ? ArrowUpRight : kpi.trend === "down" ? ArrowDownRight : Minus;

  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-soft transition-all duration-200",
        "hover:border-foreground/15 hover:shadow-lifted",
        "motion-safe:animate-fade-up motion-safe:opacity-0",
      )}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      <div className="flex items-start justify-between">
        {icon && (
          <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
            {icon}
          </div>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
            intent.text,
            intent.chipBg,
          )}
        >
          <span className={cn("size-1.5 rounded-full", intent.dot)} aria-hidden />
          <TrendIcon className="size-3" aria-hidden />
          {Math.abs(kpi.delta)}%
        </span>
      </div>
      <div className="mt-6 space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {kpi.label}
        </p>
        <p className="font-display text-[40px] font-normal leading-none tracking-[-0.02em] text-foreground tabular-nums">
          {kpi.value}
        </p>
        <p className="pt-1 text-[12px] text-muted-foreground">{kpi.deltaLabel}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        {content}
      </Link>
    );
  }
  return content;
}
