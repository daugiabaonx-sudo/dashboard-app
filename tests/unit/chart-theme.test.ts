// tests/unit/chart-theme.test.ts
// Recharts theme adapter: pure data, just CSS custom-property strings.
// Pin the wire so a stray rename or status reorder shows up in a test
// instead of a dark dashboard chart.

import { describe, expect, it } from "vitest";
import {
  CHART_PALETTE,
  SPARKLINE_COLOR,
  STATUS_COLOR,
} from "@/lib/chart-theme";
import type { SparklineIntent } from "@/lib/chart-theme";

describe("CHART_PALETTE", () => {
  it("exposes the documented CSS variable tokens", () => {
    expect(CHART_PALETTE).toEqual({
      grid: "var(--chart-grid)",
      axisLabel: "var(--muted-foreground)",
      tooltipBg: "var(--popover)",
      tooltipBorder: "var(--border)",
      cursorFill: "var(--accent)",
    });
  });
});

describe("STATUS_COLOR", () => {
  it("covers every workflow status used by the donut", () => {
    expect(Object.keys(STATUS_COLOR).sort()).toEqual([
      "backlog",
      "done",
      "in_progress",
      "in_review",
      "todo",
    ]);
  });

  it("uses the documented token for each status", () => {
    expect(STATUS_COLOR.done).toBe("var(--status-good)");
    expect(STATUS_COLOR.in_review).toBe("var(--status-warning)");
    expect(STATUS_COLOR.in_progress).toBe("var(--primary)");
    expect(STATUS_COLOR.todo).toBe("var(--status-neutral-strong)");
    expect(STATUS_COLOR.backlog).toBe("var(--status-neutral)");
  });
});

describe("SPARKLINE_COLOR", () => {
  it("exposes exactly the four intents", () => {
    const intents = Object.keys(SPARKLINE_COLOR).sort();
    expect(intents).toEqual(["critical", "good", "neutral", "warning"]);
  });

  it("uses the documented tokens", () => {
    expect(SPARKLINE_COLOR.neutral).toBe("var(--muted-foreground)");
    expect(SPARKLINE_COLOR.good).toBe("var(--status-good)");
    expect(SPARKLINE_COLOR.warning).toBe("var(--status-warning)");
    expect(SPARKLINE_COLOR.critical).toBe("var(--status-critical)");
  });

  it("SparklineIntent is the union of the four keys", () => {
    // The type itself is erased at runtime, but every key should resolve.
    const intents: SparklineIntent[] = [
      "neutral",
      "good",
      "warning",
      "critical",
    ];
    for (const intent of intents) {
      expect(typeof SPARKLINE_COLOR[intent]).toBe("string");
    }
  });
});