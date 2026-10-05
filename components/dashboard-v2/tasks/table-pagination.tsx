"use client";

// Rows-per-page selector + prev/next + count for the Animated Tasks table.
// All state is controlled — the parent owns page + pageSize.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  onPageSizeChange: (next: number) => void;
  pageSizeOptions?: number[];
  rowsPerPageLabel: string;
  pageLabel: string;
  ofLabel: string;
  showingLabel: string;
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  rowsPerPageLabel,
  pageLabel,
  ofLabel,
  showingLabel,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-[11.5px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <label className="text-[11.5px]">{rowsPerPageLabel}</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-7 rounded-md border border-input bg-transparent px-1.5 text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span aria-live="polite" className="hidden sm:inline">
          {showingLabel} {start}–{end} {ofLabel} {total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono tabular-nums">
          {pageLabel} {safePage} {ofLabel} {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="size-7"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="size-7"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
