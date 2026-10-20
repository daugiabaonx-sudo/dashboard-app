// lib/db/decision-requests.ts
// Queries and mutations for human-raised Blocker & Decision requests.

import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspaceId } from "@/lib/auth/session";
import { mockClient } from "@/lib/supabase/mock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DecisionRequest, DecisionStatus, DecisionType } from "@/lib/types";

export interface DecisionRequestRow {
  id: string;
  workspace_id: string;
  planner_task_id: string;
  task_title: string;
  project_name: string;
  type: string;
  need: string;
  raised_by: string;
  unblocker_id: string;
  needed_by: string | null;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function toDecisionRequest(row: DecisionRequestRow): DecisionRequest {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    plannerTaskId: row.planner_task_id,
    taskTitle: row.task_title,
    projectName: row.project_name ?? "",
    type: row.type as DecisionType,
    need: row.need,
    raisedBy: row.raised_by,
    unblockerId: row.unblocker_id,
    neededBy: row.needed_by ?? null,
    status: row.status as DecisionStatus,
    resolution: row.resolution ?? null,
    resolvedBy: row.resolved_by ?? null,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingDecisionTableError(
  error: { readonly message?: string; readonly code?: string } | null,
): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (msg.includes("decision_requests") &&
      (msg.includes("schema cache") || msg.includes("does not exist")))
  );
}

export async function listOpenDecisionRequests(workspaceId?: string): Promise<DecisionRequest[]> {
  const wsId = workspaceId ?? (await getCurrentWorkspaceId());
  const supabase = await createSupabaseServerClient();
  let { data, error } = await supabase
    .from("decision_requests")
    .select("*")
    .eq("workspace_id", wsId)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (isMissingDecisionTableError(error)) {
    ({ data, error } = await mockClient
      .from("decision_requests")
      .select("*")
      .eq("workspace_id", wsId)
      .eq("status", "open")
      .order("created_at", { ascending: true }));
  }
  if (error) throw new Error(`listOpenDecisionRequests: ${error.message}`);
  return (data ?? []).map((r) => toDecisionRequest(r as unknown as DecisionRequestRow));
}

export async function getDecisionRequestById(id: string): Promise<DecisionRequest | null> {
  const supabase = await createSupabaseServerClient();
  let { data, error } = await supabase
    .from("decision_requests")
    .select("*")
    .eq("id", id);
  if (isMissingDecisionTableError(error)) {
    ({ data, error } = await mockClient
      .from("decision_requests")
      .select("*")
      .eq("id", id));
  }
  if (error) throw new Error(`getDecisionRequestById: ${error.message}`);
  const rows = (data ?? []) as unknown as DecisionRequestRow[];
  return rows[0] ? toDecisionRequest(rows[0]) : null;
}

export async function findOpenDecisionByTask(
  plannerTaskId: string,
  workspaceId?: string,
): Promise<DecisionRequest | null> {
  const wsId = workspaceId ?? (await getCurrentWorkspaceId());
  const supabase = await createSupabaseServerClient();
  let { data, error } = await supabase
    .from("decision_requests")
    .select("*")
    .eq("workspace_id", wsId)
    .eq("planner_task_id", plannerTaskId)
    .eq("status", "open");
  if (isMissingDecisionTableError(error)) {
    ({ data, error } = await mockClient
      .from("decision_requests")
      .select("*")
      .eq("workspace_id", wsId)
      .eq("planner_task_id", plannerTaskId)
      .eq("status", "open"));
  }
  if (error) throw new Error(`findOpenDecisionByTask: ${error.message}`);
  const rows = (data ?? []) as unknown as DecisionRequestRow[];
  return rows[0] ? toDecisionRequest(rows[0]) : null;
}

export interface CreateDecisionRequestParams {
  readonly workspaceId?: string;
  readonly plannerTaskId: string;
  readonly taskTitle: string;
  readonly projectName: string;
  readonly type: DecisionType;
  readonly need: string;
  readonly raisedBy: string;
  readonly unblockerId: string;
  readonly neededBy: string | null;
}

export async function createDecisionRequest(
  params: CreateDecisionRequestParams,
): Promise<DecisionRequest> {
  const wsId = params.workspaceId ?? (await getCurrentWorkspaceId());
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const rowPayload = {
    workspace_id: wsId,
    planner_task_id: params.plannerTaskId,
    task_title: params.taskTitle,
    project_name: params.projectName,
    type: params.type,
    need: params.need,
    raised_by: params.raisedBy,
    unblocker_id: params.unblockerId,
    needed_by: params.neededBy,
    status: "open",
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
  let { data, error } = await supabase
    .from("decision_requests")
    .insert(rowPayload)
    .select("*");
  if (isMissingDecisionTableError(error)) {
    ({ data, error } = await mockClient
      .from("decision_requests")
      .insert(rowPayload)
      .select("*"));
  }
  if (error) throw new Error(`createDecisionRequest: ${error.message}`);
  const rows = (data ?? []) as unknown as DecisionRequestRow[];
  const created = rows[0];
  if (!created) throw new Error("createDecisionRequest: insert returned no row");
  revalidatePath("/");
  return toDecisionRequest(created);
}

export interface ResolveDecisionRequestParams {
  readonly action: "resolve" | "cancel";
  readonly resolution: string;
  readonly actorId: string;
}

export async function resolveDecisionRequest(
  id: string,
  params: ResolveDecisionRequestParams,
): Promise<DecisionRequest> {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const nextStatus: DecisionStatus = params.action === "resolve" ? "resolved" : "cancelled";
  const updatePayload = {
    status: nextStatus,
    resolution: params.resolution.trim() || null,
    resolved_by: params.actorId,
    resolved_at: nowIso,
    updated_at: nowIso,
  };
  let { data, error } = await supabase
    .from("decision_requests")
    .update(updatePayload)
    .eq("id", id)
    .select("*");
  if (isMissingDecisionTableError(error)) {
    ({ data, error } = await mockClient
      .from("decision_requests")
      .update(updatePayload)
      .eq("id", id)
      .select("*"));
  }
  if (error) throw new Error(`resolveDecisionRequest: ${error.message}`);
  const rows = (data ?? []) as unknown as DecisionRequestRow[];
  const updated = rows[0];
  if (!updated) throw new Error("resolveDecisionRequest: update returned no row");
  revalidatePath("/");
  return toDecisionRequest(updated);
}
