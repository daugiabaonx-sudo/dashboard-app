import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sparkline } from "@/components/dashboard/sparkline";
import type { SparklineIntent } from "@/lib/chart-theme";

type KpiIntent = "neutral" | "good" | "warning" | "critical";
type KpiTrend = "up" | "down" | "flat";

interface BaseProps {
  label: string;
  value: number | string;
  delta?: number;
  deltaLabel?: string;
  trend?: KpiTrend;
  intent?: KpiIntent;
  href?: string;
  icon?: ReactNode;
  delay?: number;
}

interface CompactProps extends BaseProps {
  /** Inline sparkline data — last N data points, oldest first. */
  sparkline?: number[];
  /** Optional brand-gradient icon block rendered before the label (v2 only). */
  iconBlock?: ReactNode;
}

const intentMap: Record<KpiIntent, { text: string; chipBg: string; dot: string }> = {
  neutral: {
    text: "text-muted-foreground",
    chipBg: "bg-secondary",
    dot: "bg-muted-foreground",
  },
  good: {
    text: "text-status-good",
    chipBg: "bg-status-good/10",
    dot: "bg-status-good",
  },
  warning: {
    text: "text-status-warning",
    chipBg: "bg-status-warning/10",
    dot: "bg-status-warning",
  },
  critical: {
    text: "text-status-critical",
    chipBg: "bg-status-critical/10",
    dot: "bg-status-critical",
  },
};

const TrendIcon = ({ trend }: { trend: KpiTrend }) =>
  trend === "up" ? (
    <ArrowUpRight className="size-3" aria-hidden />
  ) : trend === "down" ? (
    <ArrowDownRight className="size-3" aria-hidden />
  ) : (
    <Minus className="size-3" aria-hidden />
  );

function DeltaChip({
  delta,
  trend,
  intent,
}: {
  delta: number | undefined;
  trend: KpiTrend | undefined;
  intent: KpiIntent;
}) {
  if (delta === undefined) return null;
  const tones = intentMap[intent];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        tones.text,
        tones.chipBg,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tones.dot)} aria-hidden />
      <TrendIcon trend={trend ?? "flat"} />
      {Math.abs(delta)}%
    </span>
  );
}

/** Full KPI tile — large number, icon, delta chip. Used as hero metric. */
export function KpiTile({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  icon,
  href,
  delay = 0,
  intent = "neutral",
}: BaseProps) {
  const iconTone: Record<KpiIntent, string> = {
    neutral: "blue",
    good: "green",
    warning: "orange",
    critical: "red",
  };

  const content = (
    <div
      className={cn(
        "surface-kpi group motion-safe:animate-fade-up motion-safe:opacity-0",
        "min-h-[148px] p-5",
      )}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      {icon && <span className={cn("stat-icon", iconTone[intent])}>{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="stat-label text-muted-foreground">{label}</p>
          <DeltaChip delta={delta} trend={trend} intent={intent} />
        </div>
        <p className="stat-number text-foreground tabular-nums">{value}</p>
        {deltaLabel && <p className="stat-caption">{deltaLabel}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }
  return content;
}

/** Compact KPI strip — used in the new dashboard top row. Layout fits
 *  five across on desktop, two on mobile. Sparkline on the right. */
export function KpiStripTile({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  intent = "neutral",
  sparkline,
  iconBlock,
  href,
  delay = 0,
}: CompactProps) {
  const sparklineIntent: SparklineIntent =
    intent === "good"
      ? "good"
      : intent === "warning"
        ? "warning"
        : intent === "critical"
          ? "critical"
          : "neutral";

  // Map KPI intent to the futuristic stat-icon color slot.
  const iconTone: Record<KpiIntent, string> = {
    neutral: "blue",
    good: "green",
    warning: "orange",
    critical: "red",
  };

  const content = (
    <div
      className={cn(
        "surface-kpi group motion-safe:animate-fade-up motion-safe:opacity-0",
        "px-4 py-3",
      )}
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <span className={cn("stat-icon", iconTone[intent])}>{iconBlock}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="stat-label text-muted-foreground">{label}</p>
          <DeltaChip delta={delta} trend={trend} intent={intent} />
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="stat-number text-foreground tabular-nums">{value}</p>
          {sparkline && sparkline.length > 1 && (
            <div className="w-24">
              <Sparkline data={sparkline} intent={sparklineIntent} />
            </div>
          )}
        </div>
        {deltaLabel && <p className="stat-caption">{deltaLabel}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }
  return content;
}