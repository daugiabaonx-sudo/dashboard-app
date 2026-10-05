"use client";

// Task modal — opens when the AnimatedTable row is clicked (or any other
// client component calls `useTaskModal().open(taskId)`). Edits are
// persisted via `lib/task-modal-storage.ts` (localStorage mock mode) and
// a toast confirms the save. Real Supabase swap later replaces the
// storage call with a PATCH round-trip and `router.refresh()`.

import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTaskModal } from "@/hooks/use-task-modal";
import {
  readTaskOverrides,
  setTaskOverride,
  type TaskOverride,
} from "@/lib/task-modal-storage";
import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DashboardTaskRow } from "@/lib/tasks-types";

interface TaskModalLabels {
  title: string;
  status: string;
  priority: string;
  progress: string;
  notes: string;
  save: string;
  cancel: string;
  saved: string;
  savedHint: string;
  statusLabels: Record<DashboardTaskRow["status"], string>;
  priorityLabels: Record<DashboardTaskRow["priority"], string>;
}

export type { TaskModalLabels };

interface TaskModalProps {
  rows: DashboardTaskRow[];
  labels: TaskModalLabels;
}

export function TaskModal({ rows, labels }: TaskModalProps) {
  const { openTaskId, close } = useTaskModal();
  const [hydrated, setHydrated] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, TaskOverride>>({});
  const formId = useId();

  // Load overrides from localStorage once the modal becomes relevant.
  useEffect(() => {
    setOverrides(readTaskOverrides());
    setHydrated(true);
  }, [openTaskId]);

  const row = useMemo(
    () => (openTaskId ? rows.find((r) => r.id === openTaskId) ?? null : null),
    [openTaskId, rows],
  );

  const current = row
    ? {
        status: overrides[row.id]?.status ?? row.status,
        priority: overrides[row.id]?.priority ?? row.priority,
        notes: overrides[row.id]?.notes ?? "",
      }
    : null;

  const isOpen = openTaskId !== null;

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!row || !current) return;
    const formData = new FormData(e.currentTarget);
    const status = String(formData.get("status")) as DashboardTaskRow["status"];
    const priority = String(formData.get("priority")) as DashboardTaskRow["priority"];
    const progress = Number(formData.get("progress") ?? row.progress);
    const notes = String(formData.get("notes") ?? "");

    const next: TaskOverride = {
      taskId: row.id,
      status,
      priority,
      notes,
      updatedAt: new Date().toISOString(),
    };
    setTaskOverride(next);
    setOverrides((prev) => ({ ...prev, [row.id]: next }));
    toast.success(labels.saved, { description: labels.savedHint });
    close();
    // Drain the progress-clamp noise: never reach the DOM with NaN.
    void progress;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        {row && current ? (
          <>
            <DialogHeader>
              <DialogTitle>{labels.title}</DialogTitle>
              <DialogDescription>{row.title}</DialogDescription>
            </DialogHeader>
            <form id={formId} onSubmit={handleSave} className="space-y-4">
              <fieldset className="space-y-1.5">
                <label
                  htmlFor={`${formId}-status`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {labels.status}
                </label>
                <select
                  id={`${formId}-status`}
                  name="status"
                  defaultValue={current.status}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  )}
                >
                  {(Object.keys(labels.statusLabels) as Array<DashboardTaskRow["status"]>).map(
                    (key) => (
                      <option key={key} value={key}>
                        {labels.statusLabels[key]}
                      </option>
                    ),
                  )}
                </select>
              </fieldset>

              <fieldset className="space-y-1.5">
                <label
                  htmlFor={`${formId}-priority`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {labels.priority}
                </label>
                <select
                  id={`${formId}-priority`}
                  name="priority"
                  defaultValue={current.priority}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  )}
                >
                  {(Object.keys(labels.priorityLabels) as Array<DashboardTaskRow["priority"]>).map(
                    (key) => (
                      <option key={key} value={key}>
                        {labels.priorityLabels[key]}
                      </option>
                    ),
                  )}
                </select>
              </fieldset>

              <fieldset className="space-y-1.5">
                <label
                  htmlFor={`${formId}-progress`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {labels.progress}
                </label>
                <input
                  id={`${formId}-progress`}
                  type="range"
                  name="progress"
                  min={0}
                  max={100}
                  step={5}
                  defaultValue={row.progress}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary"
                />
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {row.progress}%
                </span>
              </fieldset>

              <fieldset className="space-y-1.5">
                <label
                  htmlFor={`${formId}-notes`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {labels.notes}
                </label>
                <textarea
                  id={`${formId}-notes`}
                  name="notes"
                  rows={3}
                  defaultValue={current.notes}
                  className={cn(
                    "block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-soft",
                    "placeholder:text-muted-foreground/70",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  )}
                />
              </fieldset>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={close}>
                  {labels.cancel}
                </Button>
                <Button type="submit">{labels.save}</Button>
              </div>
            </form>
          </>
        ) : (
          hydrated && (
            <p className="text-sm text-muted-foreground">…</p>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}