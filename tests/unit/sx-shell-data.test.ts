// tests/unit/sx-shell-data.test.ts
// The dashboard shell (sidebar + topbar) is derived from the signed-in session
// and the Planner dataset only — no demo users, teams or notifications.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSxShell } from "@/lib/sx-shell-data";
import type { SxDataset } from "@/lib/sx-dashboard";

const ROOT_DIR = resolve(__dirname, "../..");

const DS: SxDataset = {
  source: "planner",
  employees: [
    { id: "a", name: "An", initials: "A", role: "Thành viên", team: "Kỹ thuật", avatar: "avatar-1" },
    { id: "b", name: "Bình", initials: "B", role: "Thành viên", team: "Bán hàng", avatar: "avatar-2" },
    { id: "c", name: "Chi", initials: "C", role: "Thành viên", team: "Kỹ thuật", avatar: "avatar-3" },
    { id: "planner-unassigned", name: "Chưa giao", initials: "?", role: "—", team: "—", avatar: "avatar-4" },
  ],
  projects: [
    { id: "p1", name: "Website", color: "#000" },
    { id: "p2", name: "App", color: "#111" },
  ],
  tasks: [],
  blockers: [],
  projectHealth: [],
  notifications: [],
};

describe("buildSxShell", () => {
  it("builds the profile from the session and the role", () => {
    const shell = buildSxShell({ userId: "u-9", email: "lan@sunext.vn", fullName: "Trần Thị Lan" }, DS, "manager");
    expect(shell.profile).toEqual({ userId: "u-9", name: "Trần Thị Lan", initials: "TL", roleLabel: "Manager" });
    expect(shell.canEdit).toBe(true);
  });

  it("normalizes legacy Nguyen Minh Anh identity to Admin (AD)", () => {
    const shell = buildSxShell(
      { userId: "00000000-0000-0000-0000-00000000000a", email: "minhanh@sunext.io", fullName: "Nguyen Minh Anh" },
      DS,
      "manager",
    );
    expect(shell.profile).toEqual({
      userId: "00000000-0000-0000-0000-00000000000a",
      name: "Admin",
      initials: "AD",
      roleLabel: "Manager",
    });
  });

  it("is read-only for members and when the role is unknown", () => {
    const member = buildSxShell({ userId: "u", email: "", fullName: "X" }, DS, "member");
    expect(member.canEdit).toBe(false);
    expect(member.profile.roleLabel).toBe("Thành viên");
    expect(buildSxShell({ userId: "u", email: "", fullName: "X" }, DS, null).canEdit).toBe(false);
  });

  it("falls back to the email name when the session has no full name", () => {
    const shell = buildSxShell({ userId: "u-9", email: "lan@sunext.vn", fullName: "  " }, DS, null);
    expect(shell.profile.name).toBe("lan");
    expect(shell.profile.initials).toBe("L");
  });

  it("lists sorted unique teams from Planner, skipping the unassigned placeholder", () => {
    expect(buildSxShell({ userId: "u", email: "", fullName: "X" }, DS, null).teams).toEqual(["Bán hàng", "Kỹ thuật"]);
  });

  it("also lists plan groups reached only through tasks", () => {
    const ds: SxDataset = {
      ...DS,
      projects: [{ id: "mkt", name: "Marketing Manage Task", color: "#000", group: "Marketing" }],
      tasks: [
        { id: "t", title: "t", employeeId: "a", projectId: "mkt", priority: "low", status: "in_progress", progress: 0, deadline: "", notes: "" },
      ],
    };
    expect(buildSxShell({ userId: "u", email: "", fullName: "X" }, ds, null).teams).toEqual(["Bán hàng", "Kỹ thuật", "Marketing"]);
  });

  it("lists Planner plan names as projects and passes notifications through", () => {
    const shell = buildSxShell({ userId: "u", email: "", fullName: "X" }, DS, null);
    expect(shell.projects).toEqual(["Website", "App"]);
    expect(shell.notifications).toEqual([]);
  });

  it("returns empty lists for an empty dataset", () => {
    const empty: SxDataset = { ...DS, employees: [], projects: [] };
    const shell = buildSxShell({ userId: "u", email: "", fullName: "X" }, empty, null);
    expect(shell.teams).toEqual([]);
    expect(shell.projects).toEqual([]);
  });
});

describe("V2 layout & legacy cleanup contract", () => {
  it("app/layout.tsx does not mount QueryProvider or RealtimeSubscriptions", () => {
    const layoutSrc = readFileSync(resolve(ROOT_DIR, "app/layout.tsx"), "utf8");
    expect(layoutSrc).not.toContain("QueryProvider");
    expect(layoutSrc).not.toContain("RealtimeSubscriptions");
    expect(layoutSrc).not.toContain("@/hooks/query-client");
    expect(layoutSrc).not.toContain("@/components/realtime/subscriptions");
    expect(layoutSrc).toContain("<ThemeProvider>{children}</ThemeProvider>");
  });

  it("lib/sx-shell-data.ts defines SxProfile and SxShellData without importing from components/sunext", () => {
    const shellDataSrc = readFileSync(resolve(ROOT_DIR, "lib/sx-shell-data.ts"), "utf8");
    expect(shellDataSrc).not.toContain("@/components/sunext");
    expect(shellDataSrc).toContain("export interface SxProfile");
    expect(shellDataSrc).toContain("export interface SxShellData");
  });

  it("removes unreferenced legacy UI component directories and dead lib/sx-page-data.ts", () => {
    const removedPaths = [
      "lib/sx-page-data.ts",
      "app/(dashboard)/_components",
      "components/sunext",
      "components/layout",
      "components/tasks",
      "components/reports",
      "components/calendar",
      "components/realtime",
      "components/ui",
      "hooks",
    ];
    for (const relPath of removedPaths) {
      expect(existsSync(resolve(ROOT_DIR, relPath)), `${relPath} should be removed`).toBe(false);
    }
  });

  it("removes obsolete legacy E2E specs while keeping V2 and auth/security specs", () => {
    const removedE2e = [
      "tests/e2e/animated-table.spec.ts",
      "tests/e2e/calendar.spec.ts",
      "tests/e2e/dashboard.spec.ts",
      "tests/e2e/i18n-cleanup.spec.ts",
      "tests/e2e/locale-switcher.spec.ts",
      "tests/e2e/navigation.spec.ts",
      "tests/e2e/realtime-cross-tab.spec.ts",
      "tests/e2e/realtime-invalidation.spec.ts",
      "tests/e2e/states.spec.ts",
      "tests/e2e/task-modal.spec.ts",
      "tests/e2e/tasks.spec.ts",
      "tests/e2e/_helpers/locale.ts",
    ];
    for (const relPath of removedE2e) {
      expect(existsSync(resolve(ROOT_DIR, relPath)), `${relPath} should be removed`).toBe(false);
    }

    const keptE2e = [
      "tests/e2e/auth.spec.ts",
      "tests/e2e/auth-realmode.spec.ts",
      "tests/e2e/auth.setup.ts",
      "tests/e2e/dashboard-v2.spec.ts",
      "tests/e2e/security-headers.spec.ts",
    ];
    for (const relPath of keptE2e) {
      expect(existsSync(resolve(ROOT_DIR, relPath)), `${relPath} should exist`).toBe(true);
    }
  });
});
