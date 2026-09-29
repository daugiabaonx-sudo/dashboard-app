// hooks/use-tasks.ts
// Client-side task hooks: list, status mutation, assignee mutation, delete.
// Mutations use optimistic updates with rollback on error.

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { csrfFetch } from "@/lib/csrf-client";
import type { Task, TaskStatus } from "@/lib/types";

const KEYS = {
  list: (workspaceId: string) => ["tasks", workspaceId] as const,
  byProject: (workspaceId: string, projectId: string) =>
    ["tasks", workspaceId, "project", projectId] as const,
  detail: (workspaceId: string, taskId: string) =>
    ["tasks", workspaceId, "detail", taskId] as const,
};

async function fetchTasks(workspaceId: string): Promise<Task[]> {
  const res = await fetch(`/api/tasks?workspace=${workspaceId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return (await res.json()) as Task[];
}

export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: KEYS.list(workspaceId),
    queryFn: () => fetchTasks(workspaceId),
  });
}

export function useSetTaskStatus(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: TaskStatus; previous?: Task }) => {
      const res = await csrfFetch(`/api/tasks/${vars.id}/status`, {
        method: "PATCH",
        body: { status: vars.status },
      });
      if (!res.ok) throw new Error("Failed to update task status");
      return (await res.json()) as Task;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: KEYS.list(workspaceId) });
      const previous = qc.getQueryData<Task[]>(KEYS.list(workspaceId));
      qc.setQueryData<Task[]>(KEYS.list(workspaceId), (old) =>
        (old ?? []).map((t) =>
          t.id === vars.id
            ? { ...t, status: vars.status, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(KEYS.list(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.list(workspaceId) });
    },
  });
}

export function useDeleteTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string }) => {
      const res = await csrfFetch(`/api/tasks/${vars.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      return vars.id;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: KEYS.list(workspaceId) });
      const previous = qc.getQueryData<Task[]>(KEYS.list(workspaceId));
      qc.setQueryData<Task[]>(KEYS.list(workspaceId), (old) =>
        (old ?? []).filter((t) => t.id !== vars.id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(KEYS.list(workspaceId), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEYS.list(workspaceId) });
    },
  });
}
