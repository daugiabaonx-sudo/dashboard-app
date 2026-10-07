// tests/unit/auth/permissions.test.ts
// Only Owner / Admin / Manager may edit Microsoft Planner tasks from the
// dashboard; everyone else (and unknown roles) is read-only.

import { describe, expect, it } from "vitest";
import { canEditPlanner, roleLabel } from "@/lib/auth/permissions";

describe("canEditPlanner", () => {
  it.each(["owner", "admin", "manager"])("allows %s", (role) => {
    expect(canEditPlanner(role)).toBe(true);
  });

  it.each(["member", "viewer", "", "OWNER ", "superuser", null, undefined])("denies %s", (role) => {
    expect(canEditPlanner(role)).toBe(false);
  });
});

describe("roleLabel", () => {
  it.each([
    ["owner", "Owner"],
    ["admin", "Admin"],
    ["manager", "Manager"],
    ["member", "Thành viên"],
    ["viewer", "Người xem"],
  ])("labels %s as %s", (role, label) => {
    expect(roleLabel(role)).toBe(label);
  });

  it("labels unknown roles as a member", () => {
    expect(roleLabel(null)).toBe("Thành viên");
    expect(roleLabel("x")).toBe("Thành viên");
  });
});
