// Recharts theme adapter. Status colors follow the same workflow ramp
// the rest of the app uses (`status-good` → `status-warning` → `primary`
// → `status-neutral`), so a chart and a badge share the same hue.
//
// Read at render time — CSS custom properties track theme switches
// (light / dark / system) without needing a re-mount.

export const CHART_PALETTE = {
  grid: "var(--chart-grid)",
  axisLabel: "var(--muted-foreground)",
  tooltipBg: "var(--popover)",
  tooltipBorder: "var(--border)",
  cursorFill: "var(--accent)",
} as const;

export const STATUS_COLOR: Record<
  "done" | "in_review" | "in_progress" | "todo" | "backlog",
  string
> = {
  done: "var(--status-good)",
  in_review: "var(--status-warning)",
  in_progress: "var(--primary)",
  todo: "var(--status-neutral-strong)",
  backlog: "var(--status-neutral)",
};

export const SPARKLINE_COLOR = {
  neutral: "var(--muted-foreground)",
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
} as const;

export type SparklineIntent = keyof typeof SPARKLINE_COLOR;