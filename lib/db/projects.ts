// lib/db/projects.ts
// Project queries + mutations. Read functions return app-shaped Project;
// mutations use Zod schemas from lib/schemas/project.ts.

import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/schemas/project";
import type { Project, ProjectPriority, ProjectStatus } from "@/lib/types";

interface ProjectRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  owner_id: string;
  member_ids: string[];
  start_date: string;
  due_date: string;
  progress: number;
  budget: number;
  spent: number;
  tags: string[];
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as ProjectStatus,
    priority: row.priority as ProjectPriority,
    ownerId: row.owner_id,
    memberIds: row.member_ids,
    startDate: row.start_date,
    dueDate: row.due_date,
    progress: row.progress,
    budget: row.budget,
    spent: row.spent,
    tags: row.tags,
  };
}

export async function listProjects(): Promise<Project[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []).map((r) => toProject(r as unknown as ProjectRow));
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id);
  if (error) throw new Error(`getProject: ${error.message}`);
  const rows = (data ?? []) as unknown as ProjectRow[];
  const row = rows[0];
  return row ? toProject(row) : null;
}

export async function createProject(
  workspaceId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const parsed = createProjectSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name: parsed.name,
      description: parsed.description,
      status: parsed.status,
      priority: parsed.priority,
      owner_id: parsed.ownerId,
      member_ids: parsed.memberIds,
      start_date: parsed.startDate,
      due_date: parsed.dueDate,
      budget: parsed.budget,
      tags: parsed.tags,
    })
    .select("*");
  if (error) throw new Error(`createProject: ${error.message}`);
  const row = ((data ?? []) as unknown as ProjectRow[])[0];
  if (!row) throw new Error("createProject: no row returned");
  revalidatePath("/projects");
  return toProject(row);
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  // Capture the keys the caller actually supplied. `updateProjectSchema =
  // createProjectSchema.partial()` (Zod 4) preserves the create-schema's
  // `.default(...)` values, so `parse({ name: "Renamed" })` returns
  // `{ name: "Renamed", description: "", status: "planning", priority:
  // "medium", memberIds: [], budget: 0, tags: [], ownerId: undefined,
  // startDate: undefined, dueDate: undefined }` — there's no way to tell
  // from `parsed` alone which keys were explicit vs filled by Zod defaults.
  // Restrict the forwarded set to caller-supplied keys to avoid clobbering
  // real existing row columns on partial PATCH.
  const suppliedKeys = Object.keys(input);
  const parsed = updateProjectSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const updateRow: Record<string, unknown> = {};
  if (suppliedKeys.includes("name")) updateRow.name = parsed.name;
  if (suppliedKeys.includes("description"))
    updateRow.description = parsed.description;
  if (suppliedKeys.includes("status")) updateRow.status = parsed.status;
  if (suppliedKeys.includes("priority")) updateRow.priority = parsed.priority;
  if (suppliedKeys.includes("ownerId")) updateRow.owner_id = parsed.ownerId;
  if (suppliedKeys.includes("memberIds"))
    updateRow.member_ids = parsed.memberIds;
  if (suppliedKeys.includes("startDate"))
    updateRow.start_date = parsed.startDate;
  if (suppliedKeys.includes("dueDate")) updateRow.due_date = parsed.dueDate;
  if (suppliedKeys.includes("budget")) updateRow.budget = parsed.budget;
  if (suppliedKeys.includes("tags")) updateRow.tags = parsed.tags;

  const { data, error } = await supabase
    .from("projects")
    .update(updateRow)
    .eq("id", id)
    .select("*");
  if (error) throw new Error(`updateProject: ${error.message}`);
  const row = ((data ?? []) as unknown as ProjectRow[])[0];
  if (!row) throw new Error("updateProject: no row returned");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  return toProject(row);
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(`deleteProject: ${error.message}`);
  revalidatePath("/projects");
}
