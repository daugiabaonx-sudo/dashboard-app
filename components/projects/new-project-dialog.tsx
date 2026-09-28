// components/projects/new-project-dialog.tsx
// Dialog form for creating a new project. RHF + Zod, posts to /api/projects,
// triggers router.refresh so the projects page re-renders server-side.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createProjectSchema, type CreateProjectInput } from "@/lib/schemas/project";
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

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_VALUES = ["planning", "active", "on_hold", "completed"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const inOneMonth = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      priority: "medium",
      ownerId: "",
      memberIds: [],
      startDate: today,
      dueDate: inOneMonth,
      budget: 0,
      tags: [],
    },
  });

  async function onSubmit(values: CreateProjectInput) {
    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/projects", {
        method: "POST",
        body: values,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(data.error ?? "Failed to create project");
        return;
      }
      toast.success("Project created");
      reset();
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
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Spin up a new initiative. You can edit everything later.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="name"
              {...register("name")}
              aria-invalid={Boolean(errors.name)}
              placeholder="e.g. Onboarding refresh"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              placeholder="What's this project about?"
            />
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
                htmlFor="startDate"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Start date
              </label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
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
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="budget"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Budget
            </label>
            <Input
              id="budget"
              type="number"
              min={0}
              {...register("budget", { valueAsNumber: true })}
            />
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
              {submitting ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
