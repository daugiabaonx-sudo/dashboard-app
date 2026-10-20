// lib/v2/v2-decisions.ts
// Pure view-model for the redesigned Blocker & Decision card (F1 Giơ tay,
// F3 Đang chờ ai + wait-age clock, F6 Khép vòng + unassigned assignment rows).
// No I/O, no ambient clock reads — `now` is injected by the caller.

import { canEditPlanner } from "@/lib/auth/permissions";
import type { DecisionRequest, DecisionType, UserRole } from "@/lib/types";
import type { V2Task } from "./v2-model";

export type V2DecisionTab = "waiting" | "mine" | "team";
export type V2WaitTone = "fresh" | "warn" | "stale";

export interface V2WaitAge {
  readonly hours: number;
  readonly tone: V2WaitTone;
  readonly label: string;
}

export interface V2DecisionMember {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly role: UserRole;
  readonly roleLabel: string;
}

export interface V2DecisionRow {
  readonly id: string;
  readonly kind: "request" | "unassigned";
  readonly plannerTaskId: string;
  readonly taskCode: string;
  readonly taskTitle: string;
  readonly orphaned: boolean;
  readonly project: string;
  readonly type: DecisionType | "unassigned";
  readonly typeLabel: string;
  readonly need: string;
  readonly raisedById: string;
  readonly raisedByName: string;
  readonly unblockerId: string;
  readonly unblockerName: string;
  readonly neededBy: string | null;
  readonly wait: V2WaitAge;
  readonly isWaitingOnMe: boolean;
  readonly isMine: boolean;
  readonly canResolve: boolean;
  readonly canCancel: boolean;
}

export const DECISION_TYPE_LABELS: Readonly<Record<DecisionType, string>> = {
  decision: "Cần quyết định",
  waiting_on: "Chờ người/team khác",
  missing_info: "Thiếu thông tin",
  missing_resource: "Thiếu tài nguyên/quyền",
  technical: "Vướng kỹ thuật",
};

const HOUR_MS = 3_600_000;
const ROLE_PRIORITY: Readonly<Record<UserRole, number>> = {
  owner: 0,
  admin: 1,
  manager: 2,
  member: 3,
  viewer: 4,
};

/**
 * Computes wait duration and tone from creation timestamp:
 * - < 24h  → "fresh" (🟢)
 * - 24–48h → "warn"  (🟡)
 * - >= 48h → "stale" (🔴)
 */
export function waitAge(createdAtIso: string, now: Date | number): V2WaitAge {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const createdMs = Date.parse(createdAtIso);
  const hours = Number.isFinite(createdMs)
    ? Math.max(0, Math.floor((nowMs - createdMs) / HOUR_MS))
    : 0;
  const tone: V2WaitTone = hours >= 48 ? "stale" : hours >= 24 ? "warn" : "fresh";

  if (hours < 1) {
    return { hours: 0, tone, label: "Vừa báo" };
  }
  if (hours < 24) {
    return { hours, tone, label: `${hours}h chờ` };
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const label = remHours > 0 ? `${days}d ${remHours}h chờ` : `${days}d chờ`;
  return { hours, tone, label };
}

/**
 * Returns workspace members who can be chosen as unblockers (excludes viewers),
 * ordered with Owner / Admin / Manager first, then Vietnamese-alphabetical name.
 */
export function sortUnblockerCandidates(
  members: readonly V2DecisionMember[],
): V2DecisionMember[] {
  return members
    .filter((m) => m.role !== "viewer")
    .sort(
      (a, b) =>
        (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9) ||
        a.name.localeCompare(b.name, "vi") ||
        a.id.localeCompare(b.id),
    );
}

export interface BuildDecisionRowsInput {
  readonly requests: readonly DecisionRequest[];
  readonly tasks: readonly V2Task[];
  readonly allTasks?: readonly V2Task[];
  readonly members: readonly V2DecisionMember[];
  readonly currentUserId: string;
  readonly canEdit: boolean;
  readonly now: Date;
}

/**
 * Builds the unified list of human-raised decision requests and unassigned
 * tasks for the currently filtered view.
 */
export function buildDecisionRows(input: BuildDecisionRowsInput): V2DecisionRow[] {
  const { requests, tasks, allTasks = tasks, members, currentUserId, canEdit, now } = input;
  const memberById = new Map(members.map((m) => [m.id, m]));
  const filteredByPid = new Map(tasks.map((t) => [t.pid, t]));
  const allByPid = new Map(allTasks.map((t) => [t.pid, t]));
  const hasActiveFilter = tasks.length !== allTasks.length;

  const openRequests = requests.filter((r) => r.status === "open");
  const requestTaskIds = new Set(openRequests.map((r) => r.plannerTaskId));
  const rows: V2DecisionRow[] = [];

  for (const r of openRequests) {
    const taskInFiltered = filteredByPid.get(r.plannerTaskId);
    const taskInAll = allByPid.get(r.plannerTaskId);
    // When a UI filter (team/project/period/search) is active, hide requests whose Planner task was filtered out.
    if (taskInAll && !taskInFiltered && hasActiveFilter) continue;
    const task = taskInFiltered ?? taskInAll;
    if (task?.status === "done") continue;

    const raiserName = memberById.get(r.raisedBy)?.name ?? "Thành viên";
    const unblockerName = memberById.get(r.unblockerId)?.name ?? "Quản lý";
    const isWaitingOnMe = Boolean(currentUserId && r.unblockerId === currentUserId);
    const isMine = Boolean(currentUserId && r.raisedBy === currentUserId);

    rows.push({
      id: r.id,
      kind: "request",
      plannerTaskId: r.plannerTaskId,
      taskCode: task?.id ?? "Planner",
      taskTitle: task?.title ?? r.taskTitle,
      orphaned: !taskInAll,
      project: task?.project ?? (r.projectName || "Không có dự án"),
      type: r.type,
      typeLabel: DECISION_TYPE_LABELS[r.type] ?? DECISION_TYPE_LABELS.decision,
      need: r.need,
      raisedById: r.raisedBy,
      raisedByName: raiserName,
      unblockerId: r.unblockerId,
      unblockerName,
      neededBy: r.neededBy,
      wait: waitAge(r.createdAt, now),
      isWaitingOnMe,
      isMine,
      canResolve: isWaitingOnMe || canEdit,
      canCancel: isMine || isWaitingOnMe || canEdit,
    });
  }

  // Sort human-raised requests by longest waiting first.
  rows.sort((a, b) => b.wait.hours - a.wait.hours || a.id.localeCompare(b.id));

  // Append virtual rows for Planner-blocked or unassigned incomplete tasks that don't already have an open request.
  for (const t of tasks) {
    if (t.status === "done" || requestTaskIds.has(t.pid)) continue;
    if (t.owner !== "Chưa giao" && t.status !== "blocked") continue;

    const isBlocked = t.status === "blocked";
    const isUnassigned = t.owner === "Chưa giao";
    const createdIso = `${t.createdAt ?? t.start}T00:00:00.000Z`;
    const noteText = t.notes?.trim() ?? "";
    rows.push({
      id: isBlocked ? `blocked-${t.pid}` : `unassigned-${t.pid}`,
      kind: "unassigned",
      plannerTaskId: t.pid,
      taskCode: t.id,
      taskTitle: t.title,
      orphaned: false,
      project: t.project,
      type: "unassigned",
      typeLabel: isBlocked ? "Bị chặn trên Planner" : "Cần phân công",
      need:
        noteText ||
        (isBlocked
          ? `Đang đánh dấu [Bị chặn] trên Planner: ${t.title}`
          : `Chưa giao phụ trách: ${t.title}`),
      raisedById: "",
      raisedByName: "Hệ thống Planner",
      unblockerId: "",
      unblockerName: isUnassigned ? "Chưa giao" : t.owner,
      neededBy: t.deadline || null,
      wait: waitAge(createdIso, now),
      isWaitingOnMe: canEdit,
      isMine: false,
      canResolve: false,
      canCancel: false,
    });
  }

  return rows;
}

export function filterRowsByTab(
  rows: readonly V2DecisionRow[],
  tab: V2DecisionTab,
): V2DecisionRow[] {
  if (tab === "waiting") return rows.filter((r) => r.isWaitingOnMe);
  if (tab === "mine") return rows.filter((r) => r.isMine);
  return [...rows];
}

export function tabCounts(rows: readonly V2DecisionRow[]): {
  readonly waiting: number;
  readonly mine: number;
  readonly team: number;
} {
  let waiting = 0;
  let mine = 0;
  for (const r of rows) {
    if (r.isWaitingOnMe) waiting++;
    if (r.isMine) mine++;
  }
  return { waiting, mine, team: rows.length };
}

export function defaultDecisionTab(rows: readonly V2DecisionRow[]): V2DecisionTab {
  const counts = tabCounts(rows);
  if (counts.waiting > 0) return "waiting";
  if (counts.mine > 0) return "mine";
  return "team";
}

export function isManagerOrAbove(role: UserRole): boolean {
  return canEditPlanner(role);
}
