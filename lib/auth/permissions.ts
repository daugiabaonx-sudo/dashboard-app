// lib/auth/permissions.ts
// Pure permission rules (no server-only imports — used by server pages,
// route handlers and tests alike).

import type { UserRole } from "@/lib/types";

/** Roles allowed to edit Microsoft Planner tasks from the dashboard. */
export const PLANNER_EDITOR_ROLES: readonly UserRole[] = ["owner", "admin", "manager"];

/** Roles allowed to raise a blocker / decision request (all workspace members except viewer). */
export const BLOCKER_RAISER_ROLES: readonly UserRole[] = ["owner", "admin", "manager", "member"];

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

/** Any workspace member except viewer can raise a blocker / decision request. */
export function canRaiseBlocker(role: string | null | undefined): boolean {
  return isUserRole(role) && BLOCKER_RAISER_ROLES.includes(role);
}

/**
 * Checks whether `userId` with `role` can resolve or cancel an open decision request:
 * - "resolve": the assigned unblocker OR an editor role (owner/admin/manager).
 * - "cancel": the person who raised it, the unblocker, OR an editor role.
 */
export function canResolveDecision(
  role: string | null | undefined,
  req: { readonly raisedBy: string; readonly unblockerId: string },
  userId: string,
  action: "resolve" | "cancel",
): boolean {
  if (!userId || !canRaiseBlocker(role)) return false;
  if (canEditPlanner(role) || req.unblockerId === userId) return true;
  return action === "cancel" && req.raisedBy === userId;
}

export function roleLabel(role: string | null | undefined): string {
  return isUserRole(role) ? ROLE_LABELS[role] : ROLE_LABELS.member;
}
