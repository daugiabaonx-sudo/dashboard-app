// lib/sx-shell-data.ts
// Props for the dashboard shell (sidebar + topbar), derived from the
// signed-in session and the Microsoft Planner dataset only.

import type { SxShellProps } from "@/components/sunext/sx-shell";
import type { SxDataset } from "@/lib/sx-dashboard";

export type SxShellData = Omit<SxShellProps, "children">;

/** Signed-in identity (subset of lib/auth/session#Session). */
export interface SxShellIdentity {
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
}

/** Employee team value used for Planner's "unassigned" placeholder. */
const NO_TEAM = "—";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

function displayName(identity: SxShellIdentity): string {
  return identity.fullName.trim() || identity.email.split("@")[0] || "Người dùng";
}

export function buildSxShell(identity: SxShellIdentity, dataset: SxDataset): SxShellData {
  const name = displayName(identity);
  const teams = [...new Set(dataset.employees.map((e) => e.team))]
    .filter((team) => team && team !== NO_TEAM)
    .sort((a, b) => a.localeCompare(b, "vi"));
  return {
    profile: { userId: identity.userId, name, initials: initialsOf(name), roleLabel: "Team Manager" },
    notifications: dataset.notifications,
    teams,
    projects: dataset.projects.map((p) => p.name),
  };
}
