// lib/planner/planner-dataset.ts
// Loads every plan, task and group member in the tenant into a PlannerSource,
// cached in-process for CACHE_TTL_MS (one full load is ~40 Graph calls).
// Concurrent callers share one in-flight load; failures are never cached.
// Writes call `invalidatePlannerSource()` so the next page load is fresh.
//
// Required application permissions: Tasks.Read.All (or ReadWrite) and
// Group.Read.All. Assignee names additionally need User.Read.All.

import "server-only";
import type { SxDataset } from "@/lib/sx-dashboard";
import { mapInBatches } from "./batch";
import { readPlannerConfig } from "./config";
import {
  buildPlannerDataset,
  filterPlannerPlans,
  isBlockedPlannerCategory,
  isBlockedPlannerTitle,
  PLANNER_UNASSIGNED_ID,
  type PlannerSource,
} from "./planner-mapping";
import {
  GROUP_BATCH_SIZE,
  getPlanDetails,
  getTaskDetails,
  getUsersByIds,
  isSkippableGroupError,
  listAllPlans,
  listGroupMembers,
  listPlanTasks,
} from "./planner-api";
import { error as logError } from "@/lib/logger";
import type { PlannerMember, PlannerTask } from "./types";

const CACHE_TTL_MS = 15_000;

let cached: { readonly at: number; readonly source: PlannerSource } | null = null;
let inflight: Promise<PlannerSource> | null = null;

export function invalidatePlannerSource(): void {
  cached = null;
}

async function membersOf(groupId: string): Promise<readonly PlannerMember[]> {
  try {
    return await listGroupMembers(groupId);
  } catch (e: unknown) {
    if (isSkippableGroupError(e)) return [];
    throw e;
  }
}

/** Assignees with no named entry in any group member list. */
function unnamedAssignees(tasks: readonly PlannerTask[], members: readonly PlannerMember[]): string[] {
  const named = new Set(members.filter((m) => m.displayName?.trim()).map((m) => m.id));
  const ids = tasks.flatMap((t) => Object.keys(t.assignments ?? {}));
  return [...new Set(ids)].filter((id) => id !== PLANNER_UNASSIGNED_ID && !named.has(id));
}

/** Names are optional: without User.Read.All the lookup fails and is skipped. */
async function lookupUsers(ids: readonly string[]): Promise<readonly PlannerMember[]> {
  if (ids.length === 0) return [];
  try {
    return await getUsersByIds(ids);
  } catch (e: unknown) {
    logError("planner.user_lookup_failed", { detail: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

async function categoriesOfPlan(planId: string): Promise<Readonly<Record<string, string | null>>> {
  try {
    const details = await getPlanDetails(planId);
    return details?.categoryDescriptions ?? {};
  } catch {
    return {};
  }
}

async function noteOfTask(taskId: string): Promise<string> {
  try {
    const details = await getTaskDetails(taskId);
    return details?.description?.trim() ?? "";
  } catch {
    return "";
  }
}

async function fetchSource(): Promise<PlannerSource> {
  const { tenantId } = readPlannerConfig();
  const plans = filterPlannerPlans(await listAllPlans());
  const groupIds = [...new Set(plans.map((p) => p.groupId))];
  const [taskLists, memberLists, categoryLists] = await Promise.all([
    mapInBatches(plans, GROUP_BATCH_SIZE, (p) => listPlanTasks(p.id)),
    mapInBatches(groupIds, GROUP_BATCH_SIZE, membersOf),
    mapInBatches(plans, GROUP_BATCH_SIZE, (p) => categoriesOfPlan(p.id)),
  ]);
  const tasks = taskLists.flat();
  const planCategories = Object.fromEntries(plans.map((p, i) => [p.id, categoryLists[i] ?? {}]));

  const tasksNeedingNotes = tasks.filter(
    (t) =>
      t.percentComplete < 100 &&
      (isBlockedPlannerTitle(t.title) ||
        isBlockedPlannerCategory(t, planCategories[t.planId]) ||
        Object.keys(t.assignments ?? {}).length === 0),
  );
  const [users, noteList] = await Promise.all([
    lookupUsers(unnamedAssignees(tasks, memberLists.flat())),
    mapInBatches(tasksNeedingNotes, GROUP_BATCH_SIZE, (t) => noteOfTask(t.id)),
  ]);
  const taskNotes = Object.fromEntries(
    tasksNeedingNotes
      .map((t, i) => [t.id, noteList[i] ?? ""] as const)
      .filter(([, note]) => note.length > 0),
  );

  return {
    tenantId,
    plans,
    tasks,
    members: Object.fromEntries(groupIds.map((g, i) => [g, memberLists[i]])),
    users,
    planCategories,
    taskNotes,
  };
}

export async function loadPlannerSource(): Promise<PlannerSource> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.source;
  if (!inflight) {
    inflight = fetchSource()
      .then((source) => {
        cached = { at: Date.now(), source };
        return source;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function loadPlannerDataset(now: number = Date.now()): Promise<SxDataset> {
  return buildPlannerDataset(await loadPlannerSource(), now);
}
