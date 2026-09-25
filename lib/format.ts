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
