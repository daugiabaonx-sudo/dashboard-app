// tests/unit/format.test.ts
// Unit tests for lib/format.ts — date + number formatting helpers.

import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatShortDate,
  formatRelative,
  daysUntil,
  formatNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/format";

describe("formatDate", () => {
  it("formats a date with the default pattern", () => {
    expect(formatDate("2026-01-15")).toBe("Jan 15, 2026");
  });

  it("honours a custom pattern", () => {
    expect(formatDate("2026-01-15", "yyyy/MM/dd")).toBe("2026/01/15");
  });
});

describe("formatShortDate", () => {
  it("formats as 'MMM d' with no year", () => {
    expect(formatShortDate("2026-01-15")).toBe("Jan 15");
  });
});

describe("formatRelative", () => {
  it("includes a future suffix for future timestamps", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const rel = formatRelative(future);
    expect(rel).toMatch(/in \d+ days?/);
  });
});

describe("daysUntil", () => {
  it("returns a positive number for a future date", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const iso = future.toISOString().slice(0, 10);
    const days = daysUntil(iso);
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("returns a negative number for a past date", () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const days = daysUntil(past);
    expect(days).toBeLessThanOrEqual(-3);
  });
});

describe("formatNumber", () => {
  it("groups thousands with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatCurrency", () => {
  it("produces a USD string with no decimals", () => {
    expect(formatCurrency(12345)).toBe("$12,345");
  });
});

describe("formatPercent", () => {
  it("rounds to the nearest integer and appends %", () => {
    expect(formatPercent(33.7)).toBe("34%");
    expect(formatPercent(66.4)).toBe("66%");
  });
});
