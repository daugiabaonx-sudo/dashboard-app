// lib/auth/permissions.ts
// Pure permission rules (no server-only imports — used by server pages,
// route handlers and tests alike).

import type { UserRole } from "@/lib/types";

/** Roles allowed to edit Microsoft Planner tasks from the dashboard. */
export const PLANNER_EDITOR_ROLES: readonly UserRole[] = ["owner", "admin", "manager"];

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Thành viên",
  viewer: "Người xem",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.hasOwn(ROLE_LABELS, value);
}

/** Fails closed: unknown / missing roles are read-only. */
export function canEditPlanner(role: string | null | undefined): boolean {
  return isUserRole(role) && PLANNER_EDITOR_ROLES.includes(role);
}

export function roleLabel(role: string | null | undefined): string {
  return isUserRole(role) ? ROLE_LABELS[role] : ROLE_LABELS.member;
}
