"use client";

// Column visibility picker for the Animated Tasks table. Renders a Radix
// DropdownMenu with one menuitemcheckbox per column plus Show all / Hide
// all helpers. State is lifted to the parent (controlled).

import { Columns3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

export interface ColumnDef {
  id: string;
  label: string;
}

interface TableColumnToggleProps {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  triggerLabel: string;
  showAllLabel: string;
  hideAllLabel: string;
}

export function TableColumnToggle({
  columns,
  visible,
  onToggle,
  onShowAll,
  onHideAll,
  triggerLabel,
  showAllLabel,
  hideAllLabel,
}: TableColumnToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
          <Columns3 className="size-3.5" />
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {triggerLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => {
          const isVisible = visible.has(col.id);
          return (
            <DropdownMenuItem
              key={col.id}
              role="menuitemcheckbox"
              aria-checked={isVisible}
              onSelect={(event) => {
                event.preventDefault();
                onToggle(col.id);
              }}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-sm border",
                  isVisible
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {isVisible ? <Check className="size-2.5" /> : null}
              </span>
              <span className="flex-1 truncate text-[12.5px]">{col.label}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-1.5 py-1 text-[11px]">
          <button
            type="button"
            onClick={onShowAll}
            className="rounded px-2 py-1 text-primary hover:bg-secondary"
          >
            {showAllLabel}
          </button>
          <button
            type="button"
            onClick={onHideAll}
            className="rounded px-2 py-1 text-muted-foreground hover:bg-secondary"
          >
            {hideAllLabel}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
