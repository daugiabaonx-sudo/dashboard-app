"use client";

// Shared client-side task store for the SUNEXT template views.
//
// Same behaviour as the template prototype (tasks.js / state.js): modal edits
// are kept in localStorage and layered over the server dataset. Every view
// (overview, tasks, projects, team) uses this hook so edits stay in sync.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { SxBlocker, SxDataset, SxPriority, SxStatus, SxTask } from "@/lib/sx-dashboard";
import { useSxShell } from "./sx-shell-context";
import { SxTaskModal, type SxTaskEdit } from "./sx-task-modal";

const STORAGE_KEY = "sunext_sx_task_overrides_v1";
const STATUSES: readonly SxStatus[] = ["completed", "in_progress", "not_started", "overdue", "blocked"];
const PRIORITIES: readonly SxPriority[] = ["high", "medium", "low"];

type Overrides = Record<string, SxTaskEdit>;

/** Validate untrusted localStorage content; drop anything malformed. */
function readOverrides(): Overrides {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Overrides = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      const e = v as Partial<SxTaskEdit> | null;
      if (
        e &&
        STATUSES.includes(e.status as SxStatus) &&
        PRIORITIES.includes(e.priority as SxPriority) &&
        typeof e.progress === "number" &&
        e.progress >= 0 &&
        e.progress <= 100 &&
        typeof e.notes === "string"
      ) {
        out[id] = { status: e.status as SxStatus, priority: e.priority as SxPriority, progress: e.progress, notes: e.notes };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeOverrides(next: Overrides) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota) — edits stay in memory.
  }
}

/** Settings → "Reset dữ liệu demo" (state.js#resetDemoData). */
export function clearSxTaskOverrides() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface SxTaskStore {
  tasks: SxTask[];
  blockers: SxBlocker[];
  openTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  saveTask: (id: string, edit: SxTaskEdit) => void;
}

export function useSxTaskStore(dataset: SxDataset): SxTaskStore {
  const { showToast } = useSxShell();
  const [overrides, setOverrides] = useState<Overrides>({});
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Client-only storage read after hydration (server render has no overrides).
  useEffect(() => setOverrides(readOverrides()), []);

  const tasks = useMemo(
    () => dataset.tasks.map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)),
    [dataset.tasks, overrides],
  );

  // Saving a task with any status other than "blocked" resolves its blockers
  // (tasks.js#saveTaskChanges).
  const blockers = useMemo(
    () => dataset.blockers.filter((b) => !overrides[b.taskId] || overrides[b.taskId].status === "blocked"),
    [dataset.blockers, overrides],
  );

  const closeTask = useCallback(() => setOpenTaskId(null), []);

  const saveTask = useCallback(
    (id: string, edit: SxTaskEdit) => {
      setOverrides((prev) => {
        const next = { ...prev, [id]: edit };
        writeOverrides(next);
        return next;
      });
      setOpenTaskId(null);
      showToast("Đã cập nhật công việc thành công!", "success");
    },
    [showToast],
  );

  return { tasks, blockers, openTaskId, openTask: setOpenTaskId, closeTask, saveTask };
}

/** Renders the template task modal into the shell portal (outside `.app`). */
export function SxTaskModalHost({ dataset, store }: { dataset: SxDataset; store: SxTaskStore }) {
  const { portalEl } = useSxShell();
  if (!portalEl) return null;
  const task = store.openTaskId ? store.tasks.find((t) => t.id === store.openTaskId) ?? null : null;
  return createPortal(
    <SxTaskModal
      task={task}
      employees={dataset.employees}
      projects={dataset.projects}
      blockers={store.blockers}
      onClose={store.closeTask}
      onSave={store.saveTask}
    />,
    portalEl,
  );
}
