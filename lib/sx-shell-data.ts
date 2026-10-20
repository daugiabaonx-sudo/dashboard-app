// lib/sx-shell-data.ts
// Props for the dashboard shell (sidebar + topbar), derived from the
// signed-in session and the Microsoft Planner dataset only.

import { canEditPlanner, roleLabel } from "@/lib/auth/permissions";
import { taskTeamOf, type SxDataset, type SxNotification } from "@/lib/sx-dashboard";

export interface SxProfile {
  userId: string;
  name: string;
  initials: string;
  roleLabel: string;
}

export interface SxShellData {
  profile: SxProfile;
  notifications: SxNotification[];
  teams: string[];
  projects: string[];
  /** Owner / Admin / Manager may edit Planner tasks; others are read-only. */
  canEdit: boolean;
}

/** Signed-in identity (subset of lib/auth/session#Session). */
export interface SxShellIdentity {
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
}

/** Employee team value used for Planner's "unassigned" placeholder. */
const NO_TEAM = "—";

const LEGACY_ADMIN_NAMES = new Set(["nguyen minh anh", "minh anh"]);

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "admin") return "AD";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

/** Session full name, falling back to the e-mail's local part. */
export function displayName(identity: SxShellIdentity): string {
  const raw = identity.fullName.trim();
  if (raw && LEGACY_ADMIN_NAMES.has(raw.toLowerCase())) return "Admin";
  if (identity.email.trim().toLowerCase() === "minhanh@sunext.io" && (!raw || raw.toLowerCase() === "minhanh")) {
    return "Admin";
  }
  return raw || identity.email.split("@")[0] || "Người dùng";
}

/** @param role the user's profile role (lib/auth/role#getUserRole); null = unknown, read-only. */
export function buildSxShell(identity: SxShellIdentity, dataset: SxDataset, role: string | null): SxShellData {
  const name = displayName(identity);
  const projById = new Map(dataset.projects.map((p) => [p.id, p]));
  const empById = new Map(dataset.employees.map((e) => [e.id, e]));
  const taskTeams = dataset.tasks.map((t) => taskTeamOf(projById.get(t.projectId), empById.get(t.employeeId)));
  const teams = [...new Set([...dataset.employees.map((e) => e.team), ...taskTeams])]
    .filter((team) => team && team !== NO_TEAM)
    .sort((a, b) => a.localeCompare(b, "vi"));
  return {
    profile: { userId: identity.userId, name, initials: initialsOf(name), roleLabel: roleLabel(role) },
    notifications: dataset.notifications,
    teams,
    projects: dataset.projects.map((p) => p.name),
    canEdit: canEditPlanner(role),
  };
}
