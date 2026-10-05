import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  parseISO,
} from "date-fns";

export function formatDate(iso: string, pattern = "MMM d, yyyy"): string {
  return format(parseISO(iso), pattern);
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

export function formatRelative(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}

export function daysUntil(iso: string): number {
  return differenceInCalendarDays(parseISO(iso), new Date());
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export interface DaysLabels {
  today: string;
  daysOverduePattern: string;
  daysLeftPattern: string;
}

export function formatDays(days: number, labels: DaysLabels): string {
  if (days === 0) return labels.today;
  if (days < 0) return labels.daysOverduePattern.replace("{n}", String(Math.abs(days)));
  return labels.daysLeftPattern.replace("{n}", String(days));
}

export function formatDaysStuck(n: number, labels: { pattern: string }): string {
  return labels.pattern.replace("{n}", String(n));
}
