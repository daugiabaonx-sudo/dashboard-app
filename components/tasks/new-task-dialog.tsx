// components/tasks/new-task-dialog.tsx
// Dialog form for creating a new task. Uses RHF + Zod, posts to /api/tasks,
// then invalidates the tasks query cache via a callback so the kanban/list
// re-renders without a full reload.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfFetch } from "@/lib/csrf-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProjectOption = { id: string; name: string };

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  defaultProjectId?: string;
  onCreated?: () => void;
}

const STATUS_VALUES = ["backlog", "todo", "in_progress", "in_review", "done"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

export function NewTaskDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  onCreated,
}: NewTaskDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const firstProjectId = defaultProjectId ?? projects[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: firstProjectId,
      assigneeId: undefined,
      reporterId: "",
      status: "backlog",
      priority: "medium",
      dueDate: new Date().toISOString().slice(0, 10),
      estimatedHours: 0,
      tags: [],
      blocked: false,
      blockerNote: undefined,
    },
  });

  async function onSubmit(values: CreateTaskInput) {
    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/tasks", {
        method: "POST",
        body: values,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(data.error ?? "Failed to create task");
        return;
      }
      toast.success("Task created");
      reset();
      onCreated?.();
      startTransition(() => router.refresh());
      onOpenChange(false);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Capture a unit of work. You can change details later.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="title"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Title
            </label>
            <Input
              id="title"
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              placeholder="e.g. Update onboarding copy"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="projectId"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Project
            </label>
            <select
              id="projectId"
              {...register("projectId")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="text-xs text-destructive">
                {errors.projectId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="status"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="priority"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Priority
              </label>
              <select
                id="priority"
                {...register("priority")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {PRIORITY_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="dueDate"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Due date
              </label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-xs text-destructive">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="estimatedHours"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Estimate (h)
              </label>
              <Input
                id="estimatedHours"
                type="number"
                min={0}
                {...register("estimatedHours", { valueAsNumber: true })}
              />
              {errors.estimatedHours && (
                <p className="text-xs text-destructive">
                  {errors.estimatedHours.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
