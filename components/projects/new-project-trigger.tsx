// components/projects/new-project-trigger.tsx
// Button that opens the NewProjectDialog.

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewProjectDialog } from "./new-project-dialog";

interface NewProjectTriggerProps {
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

export function NewProjectTrigger({
  variant = "default",
  size = "sm",
}: NewProjectTriggerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-variant={variant}
        data-size={size}
        className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors ${
          variant === "outline"
            ? "border border-input bg-background hover:bg-secondary"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        } ${size === "sm" ? "h-8 px-3" : "h-9 px-4"}`}
      >
        <Plus className="size-3.5" />
        New project
      </button>
      <NewProjectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
