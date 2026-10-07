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
import { buildPlannerDataset, type PlannerSource } from "./planner-mapping";
import {
  GROUP_BATCH_SIZE,
  isSkippableGroupError,
  listAllPlans,
  listGroupMembers,
  listPlanTasks,
} from "./planner-api";
import type { PlannerMember } from "./types";

const CACHE_TTL_MS = 60_000;

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

async function fetchSource(): Promise<PlannerSource> {
  const { tenantId } = readPlannerConfig();
  const plans = await listAllPlans();
  const groupIds = [...new Set(plans.map((p) => p.groupId))];
  const [taskLists, memberLists] = await Promise.all([
    mapInBatches(plans, GROUP_BATCH_SIZE, (p) => listPlanTasks(p.id)),
    mapInBatches(groupIds, GROUP_BATCH_SIZE, membersOf),
  ]);
  return {
    tenantId,
    plans,
    tasks: taskLists.flat(),
    members: Object.fromEntries(groupIds.map((g, i) => [g, memberLists[i]])),
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
