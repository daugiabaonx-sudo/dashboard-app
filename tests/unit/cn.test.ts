// tests/unit/cn.test.ts
// Unit tests for lib/cn.ts — utility used by client components to merge Tailwind classes.

import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(cn("a", undefined, false, null, "b")).toBe("a b");
  });

  it("deduplicates conflicting Tailwind classes by keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
