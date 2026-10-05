"use client";

// Expandable row for blocked tasks. Renders a chevron button + collapsible
// panel containing the blocker note. Animates with max-height + opacity
// when motion is allowed; collapses instantly under prefers-reduced-motion.

import { useState } from "react";
import { AlertOctagon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface BlockerExpandableRowProps {
  taskId: string;
  blockerNote: string;
  title: string;
  blockedLabel: string;
}

export function BlockerExpandableRow({
  taskId,
  blockerNote,
  title,
  blockedLabel,
}: BlockerExpandableRowProps) {
  const [open, setOpen] = useState(false);
  const panelId = `blk-${taskId}`;

  return (
    <div className="rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-[12px] font-medium text-status-critical"
      >
        <AlertOctagon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">
          {blockedLabel}: {title}
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>
      <div
        id={panelId}
        className={cn(
          "grid overflow-hidden text-[11.5px] text-muted-foreground transition-all duration-200",
          open
            ? "mt-2 max-h-40 opacity-100"
            : "max-h-0 opacity-0",
        )}
        style={{ transitionDuration: "var(--motion-duration, 200ms)" }}
      >
        <p className="leading-relaxed">{blockerNote}</p>
      </div>
    </div>
  );
}
