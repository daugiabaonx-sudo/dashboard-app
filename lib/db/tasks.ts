// lib/db/tasks.ts
// Task queries + mutations.

import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  taskStatusUpdateSchema,
} from "@/lib/schemas/task";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

interface TaskRow {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string;
  reporter_id: string;
  due_date: string;
  estimated_hours: number;
  logged_hours: number;
  progress: number;
  blocked: boolean;
  blocker_note: string | null;
  tags: string[];
  comments: number;
  attachments: number;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    assigneeId: row.assignee_id,
    reporterId: row.reporter_id,
    projectId: row.project_id,
    dueDate: row.due_date,
    estimatedHours: row.estimated_hours,
    loggedHours: row.logged_hours,
    progress: row.progress,
    blocked: row.blocked,
    blockerNote: row.blocker_note ?? undefined,
    tags: row.tags,
    comments: row.comments,
    attachments: row.attachments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTasks(): Promise<Task[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error(`listTasks: ${error.message}`);
  return (data ?? []).map((r) => toTask(r as unknown as TaskRow));
}

export async function listTasksByProject(projectId: string): Promise<Task[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true });
  if (error) throw new Error(`listTasksByProject: ${error.message}`);
  return (data ?? []).map((r) => toTask(r as unknown as TaskRow));
}

export async function listTasksByStatus(): Promise<Record<TaskStatus, Task[]>> {
  const tasks = await listTasks();
  const grouped: Record<TaskStatus, Task[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };
  for (const t of tasks) grouped[t.status].push(t);
  return grouped;
}

export async function getTask(id: string): Promise<Task | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id);
  if (error) throw new Error(`getTask: ${error.message}`);
  const rows = (data ?? []) as unknown as TaskRow[];
  const row = rows[0];
  return row ? toTask(row) : null;
}

export async function createTask(
  workspaceId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const parsed = createTaskSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      project_id: parsed.projectId,
      title: parsed.title,
      description: parsed.description,
      status: parsed.status,
      priority: parsed.priority,
      assignee_id: parsed.assigneeId ?? null,
      reporter_id: parsed.reporterId,
      due_date: parsed.dueDate,
      estimated_hours: parsed.estimatedHours,
      tags: parsed.tags,
      blocked: parsed.blocked,
      blocker_note: parsed.blockerNote ?? null,
    })
    .select("*");
  if (error) throw new Error(`createTask: ${error.message}`);
  const row = ((data ?? []) as unknown as TaskRow[])[0];
  if (!row) throw new Error("createTask: no row returned");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${parsed.projectId}`);
  return toTask(row);
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const parsed = updateTaskSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const updateRow: Record<string, unknown> = {};
  if (parsed.title !== undefined) updateRow.title = parsed.title;
  if (parsed.description !== undefined) updateRow.description = parsed.description;
  if (parsed.status !== undefined) updateRow.status = parsed.status;
  if (parsed.priority !== undefined) updateRow.priority = parsed.priority;
  if (parsed.assigneeId !== undefined) updateRow.assignee_id = parsed.assigneeId;
  if (parsed.dueDate !== undefined) updateRow.due_date = parsed.dueDate;
  if (parsed.estimatedHours !== undefined)
    updateRow.estimated_hours = parsed.estimatedHours;
  if (parsed.tags !== undefined) updateRow.tags = parsed.tags;
  if (parsed.blocked !== undefined) updateRow.blocked = parsed.blocked;
  if (parsed.blockerNote !== undefined) updateRow.blocker_note = parsed.blockerNote;

  const { data, error } = await supabase
    .from("tasks")
    .update(updateRow)
    .eq("id", id)
    .select("*");
  if (error) throw new Error(`updateTask: ${error.message}`);
  const row = ((data ?? []) as unknown as TaskRow[])[0];
  if (!row) throw new Error("updateTask: no row returned");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${row.project_id}`);
  return toTask(row);
}

export async function setTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task> {
  const { status: parsed } = taskStatusUpdateSchema.parse({ status });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: parsed })
    .eq("id", id)
    .select("*");
  if (error) throw new Error(`setTaskStatus: ${error.message}`);
  const row = ((data ?? []) as unknown as TaskRow[])[0];
  if (!row) throw new Error("setTaskStatus: no row returned");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${row.project_id}`);
  return toTask(row);
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`deleteTask: ${error.message}`);
  revalidatePath("/tasks");
}
