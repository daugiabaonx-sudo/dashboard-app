"use client";

// Shared client-side task store for the SUNEXT template views.
//
// Same behaviour as the template prototype (tasks.js / state.js): modal edits
// are kept in localStorage and layered over the server dataset. Every view
// (overview, tasks, projects, team) uses this hook so edits stay in sync.
//
// Microsoft Planner datasets (`dataset.source === "planner"`) instead save
// each edit to Planner via PATCH /api/planner/tasks/:id, using the task's
// ETag so a newer change made in Planner is never silently overwritten.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { csrfFetch } from "@/lib/csrf-client";
import { plannerPatchFromEdit } from "@/lib/planner/planner-mapping";
import type { SxBlocker, SxDataset, SxPriority, SxStatus, SxTask } from "@/lib/sx-dashboard";
import { useSxShell, type SxToastType } from "./sx-shell-context";
import { SxTaskModal, type SxTaskEdit } from "./sx-task-modal";

const STORAGE_KEY = "sunext_sx_task_overrides_v1";
const STATUSES: readonly SxStatus[] = ["completed", "in_progress", "not_started", "overdue", "blocked"];
const PRIORITIES: readonly SxPriority[] = ["high", "medium", "low"];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

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
        out[id] = {
          status: e.status as SxStatus,
          priority: e.priority as SxPriority,
          progress: e.progress,
          notes: e.notes,
          ...(typeof e.deadline === "string" && (e.deadline === "" || DAY_RE.test(e.deadline)) ? { deadline: e.deadline } : {}),
        };
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
  /** A Planner save is in flight. */
  saving: boolean;
  /** Tasks come from Microsoft Planner (edits are written back there). */
  isPlanner: boolean;
}

interface PlannerSaveResponse {
  task?: SxTask;
  etag?: string | null;
  error?: string;
}

type ShowToast = (message: string, type?: SxToastType) => void;

/** Planner write-back: remote task overrides + current ETags. */
function usePlannerSaver(dataset: SxDataset, showToast: ShowToast, onSaved: () => void) {
  const [remote, setRemote] = useState<Record<string, SxTask>>({});
  const [etags, setEtags] = useState<Record<string, string>>(() => dataset.taskEtags ?? {});
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (original: SxTask, edit: SxTaskEdit) => {
      const patch = plannerPatchFromEdit(original, edit);
      if (!patch) {
        onSaved();
        showToast("Không có thay đổi nào để lưu.", "info");
        return;
      }
      setSaving(true);
      try {
        const res = await csrfFetch(`/api/planner/tasks/${encodeURIComponent(original.id)}`, {
          method: "PATCH",
          body: { etag: etags[original.id] ?? "", patch },
        });
        const json = (await res.json().catch(() => ({}))) as PlannerSaveResponse;
        if (!res.ok || !json.task) {
          showToast(json.error ?? "Không lưu được vào Microsoft Planner.", "error");
          return;
        }
        const saved: SxTask = { ...json.task, notes: original.notes };
        setRemote((prev) => ({ ...prev, [original.id]: saved }));
        const nextEtag = json.etag;
        if (nextEtag) setEtags((prev) => ({ ...prev, [original.id]: nextEtag }));
        onSaved();
        showToast("Đã cập nhật công việc trên Microsoft Planner!", "success");
      } catch {
        showToast("Mất kết nối — chưa lưu được vào Microsoft Planner.", "error");
      } finally {
        setSaving(false);
      }
    },
    [etags, onSaved, showToast],
  );

  return { remote, saving, save };
}

export function useSxTaskStore(dataset: SxDataset): SxTaskStore {
  const { showToast, canEdit } = useSxShell();
  const isPlanner = dataset.source === "planner";
  const [overrides, setOverrides] = useState<Overrides>({});
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const closeTask = useCallback(() => setOpenTaskId(null), []);
  const planner = usePlannerSaver(dataset, showToast, closeTask);

  // Client-only storage read after hydration (server render has no overrides).
  // Local overrides never apply to Planner tasks — Planner is the source of truth.
  useEffect(() => {
    if (!isPlanner) setOverrides(readOverrides());
  }, [isPlanner]);

  const tasks = useMemo(
    () =>
      dataset.tasks.map((t) => planner.remote[t.id] ?? (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)),
    [dataset.tasks, overrides, planner.remote],
  );

  // Saving a task with any status other than "blocked" resolves its blockers
  // (tasks.js#saveTaskChanges).
  const blockers = useMemo(
    () => dataset.blockers.filter((b) => !overrides[b.taskId] || overrides[b.taskId].status === "blocked"),
    [dataset.blockers, overrides],
  );

  const { save: savePlanner } = planner;
  const saveTask = useCallback(
    (id: string, edit: SxTaskEdit) => {
      if (isPlanner) {
        if (!canEdit) {
          showToast("Bạn chỉ có quyền xem. Chỉ Owner, Admin hoặc Manager được sửa công việc.", "warning");
          return;
        }
        const original = tasks.find((t) => t.id === id);
        if (original) void savePlanner(original, edit);
        return;
      }
      setOverrides((prev) => {
        const next = { ...prev, [id]: edit };
        writeOverrides(next);
        return next;
      });
      setOpenTaskId(null);
      showToast("Đã cập nhật công việc thành công!", "success");
    },
    [isPlanner, canEdit, tasks, savePlanner, showToast],
  );

  return {
    tasks,
    blockers,
    openTaskId,
    openTask: setOpenTaskId,
    closeTask,
    saveTask,
    saving: planner.saving,
    isPlanner,
  };
}

/** Renders the template task modal into the shell portal (outside `.app`). */
export function SxTaskModalHost({ dataset, store }: { dataset: SxDataset; store: SxTaskStore }) {
  const { portalEl, canEdit } = useSxShell();
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
      saving={store.saving}
      notesEnabled={!store.isPlanner}
      readOnly={store.isPlanner && !canEdit}
    />,
    portalEl,
  );
}
