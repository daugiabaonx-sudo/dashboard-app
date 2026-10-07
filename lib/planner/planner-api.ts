// lib/planner/planner-api.ts
// Typed wrappers over the Microsoft Graph Planner endpoints.
//
// App-only tokens cannot use `/me/...`; everything is addressed by id:
//   groups/{groupId}/planner/plans   → plans owned by a Microsoft 365 group
//   planner/plans/{planId}/tasks     → tasks in a plan
//   planner/plans/{planId}/buckets   → columns in a plan
//
// Required application permission: Tasks.Read.All (read) or
// Tasks.ReadWrite.All (read + write), with admin consent.

import "server-only";
import type { z } from "zod";
import { mapInBatches } from "./batch";
import { GraphError, PlannerInputError } from "./errors";
import { graphList, graphRequest } from "./graph-client";
import {
  newTaskSchema,
  taskPatchSchema,
  type NewPlannerTask,
  type PlannerBucket,
  type PlannerGroup,
  type PlannerMember,
  type PlannerPlan,
  type PlannerPlanWithGroup,
  type PlannerTask,
  type PlannerTaskPatch,
} from "./types";

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/** Validates an id before it is interpolated into a Graph URL path. */
export function plannerPathId(id: string, label: string): string {
  if (!ID_RE.test(id)) throw new PlannerInputError(`Invalid ${label}`);
  return encodeURIComponent(id);
}

function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new PlannerInputError(parsed.error.issues.map((i) => i.message).join("; "));
  }
  return parsed.data;
}

function requireEtag(etag: string): string {
  if (!etag) throw new PlannerInputError("An ETag is required to modify a Planner task");
  return etag;
}

export function listGroupPlans(groupId: string): Promise<PlannerPlan[]> {
  return graphList<PlannerPlan>(`/groups/${plannerPathId(groupId, "groupId")}/planner/plans`);
}

/** Microsoft 365 ("Unified") groups are the only groups that can own plans. */
const UNIFIED_GROUPS_PATH = `/groups?$filter=${encodeURIComponent(
  "groupTypes/any(c:c eq 'Unified')",
)}&$select=id,displayName`;

/** Groups fetched in parallel per batch — keeps us well under Graph throttling. */
export const GROUP_BATCH_SIZE = 5;

export function listUnifiedGroups(): Promise<PlannerGroup[]> {
  return graphList<PlannerGroup>(UNIFIED_GROUPS_PATH);
}

/** Users in a group. Names are null unless the app also has User.Read.All. */
export function listGroupMembers(groupId: string): Promise<PlannerMember[]> {
  return graphList<PlannerMember>(
    `/groups/${plannerPathId(groupId, "groupId")}/members/microsoft.graph.user?$select=id,displayName,jobTitle,department`,
  );
}

/** Graph limit for directoryObjects/getByIds. */
const GET_BY_IDS_MAX = 1000;

interface DirectoryUser {
  readonly id: string;
  readonly displayName?: string | null;
  readonly jobTitle?: string | null;
  readonly department?: string | null;
}

/**
 * Users by id (needs User.Read.All) — for task assignees whose names the
 * group member listings don't provide. Invalid ids are dropped.
 */
export async function getUsersByIds(ids: readonly string[]): Promise<PlannerMember[]> {
  const valid = [...new Set(ids)].filter((id) => ID_RE.test(id));
  const chunks = Array.from({ length: Math.ceil(valid.length / GET_BY_IDS_MAX) }, (_, i) =>
    valid.slice(i * GET_BY_IDS_MAX, (i + 1) * GET_BY_IDS_MAX),
  );
  const results = await Promise.all(
    chunks.map((chunk) =>
      graphRequest<{ value: DirectoryUser[] }>("/directoryObjects/getByIds", {
        method: "POST",
        body: { ids: chunk, types: ["user"] },
      }),
    ),
  );
  return results.flatMap(({ data }) =>
    data.value.map((u) => ({
      id: u.id,
      displayName: u.displayName ?? null,
      jobTitle: u.jobTitle ?? null,
      department: u.department ?? null,
    })),
  );
}

/** A group without Planner (or one the app can't see) is not an error for "all plans". */
export function isSkippableGroupError(e: unknown): boolean {
  return e instanceof GraphError && (e.status === 403 || e.status === 404);
}

async function plansForGroup(group: PlannerGroup): Promise<PlannerPlanWithGroup[]> {
  try {
    const plans = await listGroupPlans(group.id);
    return plans.map((p) => ({ ...p, groupId: group.id, groupName: group.displayName }));
  } catch (e: unknown) {
    if (isSkippableGroupError(e)) return [];
    throw e;
  }
}

/** Every plan in the tenant, tagged with the group that owns it. */
export async function listAllPlans(): Promise<PlannerPlanWithGroup[]> {
  const groups = await listUnifiedGroups();
  const perGroup = await mapInBatches(groups, GROUP_BATCH_SIZE, plansForGroup);
  return perGroup.flat();
}

export async function getPlan(planId: string): Promise<PlannerPlan> {
  const { data } = await graphRequest<PlannerPlan>(
    `/planner/plans/${plannerPathId(planId, "planId")}`,
  );
  return data;
}

export function listPlanBuckets(planId: string): Promise<PlannerBucket[]> {
  return graphList<PlannerBucket>(`/planner/plans/${plannerPathId(planId, "planId")}/buckets`);
}

export function listPlanTasks(planId: string): Promise<PlannerTask[]> {
  return graphList<PlannerTask>(`/planner/plans/${plannerPathId(planId, "planId")}/tasks`);
}

export async function getTask(taskId: string): Promise<PlannerTask> {
  const { data } = await graphRequest<PlannerTask>(
    `/planner/tasks/${plannerPathId(taskId, "taskId")}`,
  );
  return data;
}

export async function createTask(input: NewPlannerTask): Promise<PlannerTask> {
  const { assigneeIds, ...fields } = parseOrThrow(newTaskSchema, input);
  const assignments = assigneeIds?.length
    ? Object.fromEntries(
        assigneeIds.map((id) => [
          id,
          { "@odata.type": "#microsoft.graph.plannerAssignment", orderHint: " !" },
        ]),
      )
    : undefined;
  const { data } = await graphRequest<PlannerTask>("/planner/tasks", {
    method: "POST",
    body: assignments ? { ...fields, assignments } : fields,
  });
  return data;
}

export async function updateTask(
  taskId: string,
  etag: string,
  patch: PlannerTaskPatch,
): Promise<PlannerTask> {
  const body = parseOrThrow(taskPatchSchema, patch);
  const { data } = await graphRequest<PlannerTask>(
    `/planner/tasks/${plannerPathId(taskId, "taskId")}`,
    { method: "PATCH", body, ifMatch: requireEtag(etag), returnRepresentation: true },
  );
  return data;
}

export async function deleteTask(taskId: string, etag: string): Promise<void> {
  await graphRequest<void>(`/planner/tasks/${plannerPathId(taskId, "taskId")}`, {
    method: "DELETE",
    ifMatch: requireEtag(etag),
  });
}
