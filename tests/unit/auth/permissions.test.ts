// tests/unit/auth/permissions.test.ts
// Only Owner / Admin / Manager may edit Microsoft Planner tasks from the
// dashboard; everyone else (and unknown roles) is read-only.

import { describe, expect, it } from "vitest";
import { canEditPlanner, canRaiseBlocker, canResolveDecision, roleLabel } from "@/lib/auth/permissions";

describe("canEditPlanner", () => {
  it.each(["owner", "admin", "manager"])("allows %s", (role) => {
    expect(canEditPlanner(role)).toBe(true);
  });

  it.each(["member", "viewer", "", "OWNER ", "superuser", null, undefined])("denies %s", (role) => {
    expect(canEditPlanner(role)).toBe(false);
  });
});

describe("canRaiseBlocker", () => {
  it.each(["owner", "admin", "manager", "member"])("allows %s to raise a blocker", (role) => {
    expect(canRaiseBlocker(role)).toBe(true);
  });

  it.each(["viewer", "", "superuser", null, undefined])("denies %s from raising a blocker", (role) => {
    expect(canRaiseBlocker(role)).toBe(false);
  });
});

describe("canResolveDecision", () => {
  const req = { raisedBy: "u-emp", unblockerId: "u-mgr" };

  it("allows the assigned unblocker or any editor role to resolve", () => {
    expect(canResolveDecision("member", req, "u-mgr", "resolve")).toBe(true);
    expect(canResolveDecision("owner", req, "u-other", "resolve")).toBe(true);
    expect(canResolveDecision("admin", req, "u-other", "resolve")).toBe(true);
    expect(canResolveDecision("manager", req, "u-other", "resolve")).toBe(true);
  });

  it("denies non-unblocker members and viewers from resolving", () => {
    expect(canResolveDecision("member", req, "u-emp", "resolve")).toBe(false);
    expect(canResolveDecision("member", req, "u-other", "resolve")).toBe(false);
    expect(canResolveDecision("viewer", req, "u-mgr", "resolve")).toBe(false);
    expect(canResolveDecision(null, req, "u-mgr", "resolve")).toBe(false);
    expect(canResolveDecision("manager", req, "", "resolve")).toBe(false);
  });

  it("allows the raiser, the unblocker, or any editor role to cancel", () => {
    expect(canResolveDecision("member", req, "u-emp", "cancel")).toBe(true);
    expect(canResolveDecision("member", req, "u-mgr", "cancel")).toBe(true);
    expect(canResolveDecision("manager", req, "u-other", "cancel")).toBe(true);
    expect(canResolveDecision("member", req, "u-other", "cancel")).toBe(false);
    expect(canResolveDecision("viewer", req, "u-emp", "cancel")).toBe(false);
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
