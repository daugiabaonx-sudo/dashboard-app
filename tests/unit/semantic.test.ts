// tests/unit/semantic.test.ts
// Unit tests for lib/semantic.ts — status/priority label + tone maps + utilization helper.

import { describe, expect, it } from "vitest";
import {
  statusLabel,
  statusTone,
  priorityLabel,
  priorityTone,
  utilizationTone,
} from "@/lib/semantic";

describe("statusLabel", () => {
  it("provides a human label for every status", () => {
    expect(Object.keys(statusLabel).sort()).toEqual(
      ["backlog", "done", "in_progress", "in_review", "todo"].sort(),
    );
    expect(statusLabel.backlog).toBe("Backlog");
    expect(statusLabel.done).toBe("Done");
  });
});

describe("statusTone", () => {
  it("returns neutral for backlog + todo and good for done", () => {
    expect(statusTone.backlog).toBe("neutral");
    expect(statusTone.todo).toBe("neutral");
    expect(statusTone.done).toBe("good");
  });

  it("returns primary for in_progress and warning for in_review", () => {
    expect(statusTone.in_progress).toBe("primary");
    expect(statusTone.in_review).toBe("warning");
  });
});

describe("priorityLabel", () => {
  it("provides a human label for every priority", () => {
    expect(Object.keys(priorityLabel).sort()).toEqual(
      ["high", "low", "medium", "urgent"].sort(),
    );
    expect(priorityLabel.urgent).toBe("Urgent");
  });
});

describe("priorityTone", () => {
  it("escalates from neutral through primary/serious to critical", () => {
    expect(priorityTone.low).toBe("neutral");
    expect(priorityTone.medium).toBe("primary");
    expect(priorityTone.high).toBe("serious");
    expect(priorityTone.urgent).toBe("critical");
  });
});

describe("utilizationTone", () => {
  it("returns neutral at exactly 0 (capacity empty = no data)", () => {
    expect(utilizationTone(0)).toBe("neutral");
  });

  it("returns critical above 90", () => {
    expect(utilizationTone(91)).toBe("critical");
  });

  it("returns warning in the (75, 90] band", () => {
    expect(utilizationTone(76)).toBe("warning");
    expect(utilizationTone(90)).toBe("warning");
  });

  it("returns good in the (0, 75] band", () => {
    expect(utilizationTone(1)).toBe("good");
    expect(utilizationTone(75)).toBe("good");
  });
});
