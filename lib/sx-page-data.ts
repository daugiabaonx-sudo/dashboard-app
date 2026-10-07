// Server-side props for the SUNEXT template shell + views.
//
// Same data source as lib/dashboard-data.ts (in-memory mock in lib/data);
// when the real Supabase adapter lands, swap the four collections here.

import { canEditPlanner } from "@/lib/auth/permissions";
import { findUser, notifications, projects, tasks, users } from "@/lib/data";
import { buildSxDataset, type SxDataset } from "@/lib/sx-dashboard";
import type { SxShellProps } from "@/components/sunext/sx-shell";

const MANAGER_ROLES = new Set(["owner", "admin", "manager"]);

export type SxShellData = Omit<SxShellProps, "children">;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

/** Signed-in identity (subset of lib/auth/session#Session). */
export interface SxIdentity {
  userId: string;
  email?: string;
  fullName?: string;
}

/**
 * @param identity signed-in user; looked up by id, then by email. When the
 *                 account isn't in the dataset (e.g. a real Supabase user)
 *                 the session's full name is shown instead.
 */
export function getSxPageData(
  identity: SxIdentity = { userId: "u1" },
): { dataset: SxDataset; shell: SxShellData } {
  const dataset = buildSxDataset({ users, projects, tasks, notifications }, Date.now());
  const email = identity.email?.toLowerCase();
  const user = findUser(identity.userId) ?? (email ? users.find((u) => u.email.toLowerCase() === email) : undefined);
  const name = user?.name ?? (identity.fullName?.trim() || "Nguyễn Minh");

  const shell: SxShellData = {
    profile: {
      userId: user?.id ?? identity.userId,
      name,
      initials: user?.initials ?? initialsOf(name),
      roleLabel: user && !MANAGER_ROLES.has(user.role) ? "Thành viên" : "Team Manager",
    },
    notifications: dataset.notifications,
    teams: [...new Set(dataset.employees.map((e) => e.team))].sort(),
    projects: dataset.projects.map((p) => p.name),
    canEdit: canEditPlanner(user?.role),
  };

  return { dataset, shell };
}
