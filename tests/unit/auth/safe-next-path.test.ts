// tests/unit/auth/safe-next-path.test.ts
import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next-path";

describe("safeNextPath", () => {
  it.each([
    ["/", "/"],
    ["/tasks", "/tasks"],
    ["/projects?plan=abc#top", "/projects?plan=abc#top"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [""],
    ["tasks"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["https://evil.com"],
    ["javascript:alert(1)"],
    ["/%0d%0aLocation: x"],
    ["/login"],
    ["/signup?x=1"],
  ])("falls back to / for unsafe or looping value %s", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });
});
