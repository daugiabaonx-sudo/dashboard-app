// tests/unit/sx-shell-data.test.ts
// The dashboard shell (sidebar + topbar) is derived from the signed-in session
// and the Planner dataset only — no demo users, teams or notifications.

import { describe, expect, it } from "vitest";
import { buildSxShell } from "@/lib/sx-shell-data";
import type { SxDataset } from "@/lib/sx-dashboard";

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
  it("builds the profile from the session", () => {
    const shell = buildSxShell({ userId: "u-9", email: "lan@sunext.vn", fullName: "Trần Thị Lan" }, DS);
    expect(shell.profile).toEqual({ userId: "u-9", name: "Trần Thị Lan", initials: "TL", roleLabel: "Team Manager" });
  });

  it("falls back to the email name when the session has no full name", () => {
    const shell = buildSxShell({ userId: "u-9", email: "lan@sunext.vn", fullName: "  " }, DS);
    expect(shell.profile.name).toBe("lan");
    expect(shell.profile.initials).toBe("L");
  });

  it("lists sorted unique teams from Planner, skipping the unassigned placeholder", () => {
    expect(buildSxShell({ userId: "u", email: "", fullName: "X" }, DS).teams).toEqual(["Bán hàng", "Kỹ thuật"]);
  });

  it("lists Planner plan names as projects and passes notifications through", () => {
    const shell = buildSxShell({ userId: "u", email: "", fullName: "X" }, DS);
    expect(shell.projects).toEqual(["Website", "App"]);
    expect(shell.notifications).toEqual([]);
  });

  it("returns empty lists for an empty dataset", () => {
    const empty: SxDataset = { ...DS, employees: [], projects: [] };
    const shell = buildSxShell({ userId: "u", email: "", fullName: "X" }, empty);
    expect(shell.teams).toEqual([]);
    expect(shell.projects).toEqual([]);
  });
});
