// localStorage helpers for the task modal. The modal persists a thin
// override map keyed by task id — title/status/priority/progress/notes
// — so edits survive reload without a real backend round-trip in
// mock mode. Real Supabase swap later replaces this with API mutations.

import type { TaskPriority, TaskStatus } from "@/lib/types";

const STORAGE_KEY = "sunext_task_overrides_v1";

export interface TaskOverride {
  taskId: string;
  status: TaskStatus;
  priority: TaskPriority;
  notes: string;
  updatedAt: string;
}

export type TaskOverrideMap = Record<string, TaskOverride>;

export function readTaskOverrides(): TaskOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as TaskOverrideMap;
  } catch {
    return {};
  }
}

export function writeTaskOverrides(next: TaskOverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be disabled / unavailable; swallow rather than
    // break the UI. Real persistence in this app is a server concern.
  }
}

export function setTaskOverride(override: TaskOverride): TaskOverrideMap {
  const current = readTaskOverrides();
  const next: TaskOverrideMap = { ...current, [override.taskId]: override };
  writeTaskOverrides(next);
  return next;
}

export function clearTaskOverride(taskId: string): TaskOverrideMap {
  const current = readTaskOverrides();
  const { [taskId]: _removed, ...rest } = current;
  writeTaskOverrides(rest);
  return rest;
}