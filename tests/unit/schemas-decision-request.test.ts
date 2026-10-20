// tests/unit/schemas-decision-request.test.ts
// Unit tests for lib/schemas/decision-request.ts.

import { describe, expect, it } from "vitest";
import {
  createDecisionRequestSchema,
  decisionTypeSchema,
  resolveDecisionRequestSchema,
} from "@/lib/schemas/decision-request";

describe("decisionTypeSchema", () => {
  it.each(["decision", "waiting_on", "missing_info", "missing_resource", "technical"])(
    "accepts valid type %s",
    (type) => {
      expect(decisionTypeSchema.parse(type)).toBe(type);
    },
  );

  it("rejects unknown types", () => {
    expect(() => decisionTypeSchema.parse("other")).toThrow();
  });
});

describe("createDecisionRequestSchema", () => {
  const validInput = {
    plannerTaskId: "task_123",
    taskTitle: "Thiết kế giao diện",
    projectName: "Sunext Manage Task",
    type: "decision" as const,
    need: "Cần chốt phương án màu sắc cho banner",
    unblockerId: "00000000-0000-0000-0000-00000000000a",
    neededBy: "2026-10-25",
  };

  it("accepts a valid decision request and trims fields", () => {
    const parsed = createDecisionRequestSchema.parse({
      ...validInput,
      need: "  Cần chốt phương án màu sắc  ",
      taskTitle: "  Thiết kế giao diện ",
    });
    expect(parsed.need).toBe("Cần chốt phương án màu sắc");
    expect(parsed.taskTitle).toBe("Thiết kế giao diện");
    expect(parsed.neededBy).toBe("2026-10-25");
  });

  it("defaults projectName to empty string and neededBy to null when omitted", () => {
    const { projectName: _p, neededBy: _n, ...minimal } = validInput;
    const parsed = createDecisionRequestSchema.parse(minimal);
    expect(parsed.projectName).toBe("");
    expect(parsed.neededBy).toBeNull();
  });

  it("rejects empty need, over-length need, or invalid unblocker UUID", () => {
    expect(createDecisionRequestSchema.safeParse({ ...validInput, need: "   " }).success).toBe(false);
    expect(createDecisionRequestSchema.safeParse({ ...validInput, need: "x".repeat(501) }).success).toBe(false);
    expect(createDecisionRequestSchema.safeParse({ ...validInput, unblockerId: "not-a-uuid" }).success).toBe(false);
    expect(createDecisionRequestSchema.safeParse({ ...validInput, neededBy: "25/10/2026" }).success).toBe(false);
  });
});

describe("resolveDecisionRequestSchema", () => {
  it("parses resolve and cancel actions", () => {
    expect(
      resolveDecisionRequestSchema.parse({ action: "resolve", resolution: "  Duyệt phương án A  " }),
    ).toEqual({
      action: "resolve",
      resolution: "Duyệt phương án A",
    });

    expect(resolveDecisionRequestSchema.parse({ action: "cancel" })).toEqual({
      action: "cancel",
      resolution: "",
    });
  });

  it("rejects unknown actions or over-length resolution", () => {
    expect(resolveDecisionRequestSchema.safeParse({ action: "reopen" }).success).toBe(false);
    expect(
      resolveDecisionRequestSchema.safeParse({ action: "resolve", resolution: "a".repeat(501) }).success,
    ).toBe(false);
  });
});
