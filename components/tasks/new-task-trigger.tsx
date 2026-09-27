// components/tasks/new-task-trigger.tsx
// Button that opens the NewTaskDialog. Used in the page toolbar and the
// global header so the same form opens from either place.

"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { NewTaskDialog } from "./new-task-dialog";

interface NewTaskTriggerProps {
  label?: string;
  showIcon?: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  children?: ReactNode;
}

export function NewTaskTrigger({
  label = "New task",
  showIcon = true,
  variant = "default",
  size = "default",
  className,
  projects,
  defaultProjectId,
  children,
}: NewTaskTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-variant={variant}
        data-size={size}
        className={
          className ??
          `inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors ${
            variant === "outline"
              ? "border border-input bg-background hover:bg-secondary"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } ${size === "sm" ? "h-8 px-3" : "h-9 px-4"}`
        }
      >
        {showIcon && <Plus className="size-3.5" />}
        {children ?? <span>{label}</span>}
      </button>
      <NewTaskDialog
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
