"use client";

// Animated Tasks table — the v2 replacement for the v1 list view.
//
// All filter/sort/page/column state lives in the URL (so deep links work
// and reload restores the view). The server has already joined the row
// shape; the client only owns the small bits of UI state.
//
// Components consumed:
//   - TableSearch — debounced search input
//   - TableColumnToggle — Radix DropdownMenu of visible columns
//   - TablePagination — rows-per-page + prev/next
//   - BlockerExpandableRow — chevron + max-height transition for blockers
//   - PriorityBadge — reuses the v2 wrapper (3-level bucket from PRIORITY_ORDER)
//
// Step 8 (task modal) will pass `onRowClick` to wire rows to the modal.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/dashboard-v2/priority-badge";
import { BlockerExpandableRow } from "@/components/dashboard-v2/tasks/blocker-expandable-row";
import { TableSearch } from "@/components/dashboard-v2/tasks/table-search";
import { TableColumnToggle, type ColumnDef } from "@/components/dashboard-v2/tasks/table-column-toggle";
import { TablePagination } from "@/components/dashboard-v2/tasks/table-pagination";
import {
  filterDashboardTasks,
  sortDashboardTasks,
  type DashboardTaskRow,
  type DashboardTaskSortDir,
  type DashboardTaskSortKey,
} from "@/lib/tasks-types";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/cn";
import { formatDays } from "@/lib/format";
import { interpolate } from "@/lib/i18n";

// PriorityBadge only handles 3 levels (DashboardPriority) — bucket urgent
// into "high" with a different label so the existing badge tones still
// work, and let the priority column render the urgent label inline.
const PRIORITY_BUCKET: Record<TaskPriority, "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "high",
};

export interface AnimatedTableLabels {
  title: string;
  search: string;
  columns: string;
  showAll: string;
  hideAll: string;
  rowsPerPage: string;
  page: string;
  of: string;
  showing: string;
  noResults: string;
  today: string;
  daysOverduePattern: string;
  daysLeftPattern: string;
  openTask: string;
  column: {
    task: string;
    project: string;
    status: string;
    priority: string;
    assignee: string;
    progress: string;
    deadline: string;
  };
  statusLabels: Record<DashboardTaskRow["status"], string>;
  priorityLabels: Record<TaskPriority, string>;
  blockerTitle: string;
  blockedBy: string;
}

interface AnimatedTableProps {
  rows: DashboardTaskRow[];
  labels: AnimatedTableLabels;
  focusId?: string;
  /**
   * Optional row click handler. When set, rows become interactive
   * (cursor-pointer, button semantics) and the callback fires with the
   * row id. Step 8 (task modal) wires this to `useTaskModal().open`.
   */
  onRowClick?: (id: string) => void;
}

interface ColumnSpec {
  id: string;
  label: string;
  align?: "left" | "right";
  cell: (row: DashboardTaskRow) => React.ReactNode;
  sortKey?: DashboardTaskSortKey;
}

const COLUMN_WIDTHS: Record<string, string> = {
  task: "minmax(220px, 2fr)",
  project: "minmax(120px, 1fr)",
  status: "minmax(120px, auto)",
  priority: "minmax(100px, auto)",
  assignee: "minmax(140px, 1fr)",
  progress: "minmax(120px, auto)",
  deadline: "minmax(90px, auto)",
};

function daysFromNow(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function AnimatedTable({ rows, labels, focusId, onRowClick }: AnimatedTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ─── Read state from URL ───────────────────────────────────────────
  const sortKey = (searchParams.get("sort") as DashboardTaskSortKey | null) ?? "dueDate";
  const sortDir = (searchParams.get("dir") as DashboardTaskSortDir | null) ?? "asc";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("size") ?? "10"));
  const query = searchParams.get("q") ?? "";
  const colsParam = searchParams.get("cols");

  const allColumns: ColumnSpec[] = useMemo(
    () => [
      {
        id: "task",
        label: labels.column.task,
        sortKey: "title",
        cell: (row) => (
          <span className="font-medium tracking-tight text-foreground">
            {row.title}
          </span>
        ),
      },
      {
        id: "project",
        label: labels.column.project,
        sortKey: "project",
        cell: (row) => (
          <span className="truncate text-muted-foreground">{row.projectName}</span>
        ),
      },
      {
        id: "status",
        label: labels.column.status,
        sortKey: "status",
        cell: (row) => (
          <Badge tone="neutral" size="sm">
            {labels.statusLabels[row.status]}
          </Badge>
        ),
      },
      {
        id: "priority",
        label: labels.column.priority,
        sortKey: "priority",
        cell: (row) => (
          <PriorityBadge
            priority={PRIORITY_BUCKET[row.priority]}
            label={labels.priorityLabels[row.priority]}
          />
        ),
      },
      {
        id: "assignee",
        label: labels.column.assignee,
        sortKey: "assignee",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: row.assigneeColor }}
            >
              {row.assigneeInitials}
            </span>
            <span className="truncate text-[12px]">{row.assigneeName}</span>
          </div>
        ),
      },
      {
        id: "progress",
        label: labels.column.progress,
        sortKey: "progress",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-brand"
                style={{ width: `${row.progress}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {row.progress}%
            </span>
          </div>
        ),
      },
      {
        id: "deadline",
        label: labels.column.deadline,
        sortKey: "dueDate",
        align: "right",
        cell: (row) => {
          const days = daysFromNow(row.dueDate);
          const tone =
            days < 0
              ? "text-status-critical"
              : days <= 3
                ? "text-status-warning"
                : "text-muted-foreground";
          const text = formatDays(days, labels);
          return (
            <span className={cn("font-mono text-[11px] tabular-nums", tone)}>
              {text}
            </span>
          );
        },
      },
    ],
    [labels],
  );

  // ─── Visible columns ───────────────────────────────────────────────
  const allIds = useMemo(() => allColumns.map((c) => c.id), [allColumns]);
  const [visibleState, setVisibleState] = useState<Set<string>>(() => {
    if (colsParam) {
      const set = new Set(colsParam.split(",").filter((id) => allIds.includes(id)));
      if (set.size > 0) return set;
    }
    return new Set(allIds);
  });

  useEffect(() => {
    if (colsParam) {
      const set = new Set(colsParam.split(",").filter((id) => allIds.includes(id)));
      if (set.size > 0) setVisibleState(set);
    }
  }, [colsParam, allIds]);

  const columnDefs: ColumnDef[] = useMemo(
    () => allColumns.map((c) => ({ id: c.id, label: c.label })),
    [allColumns],
  );

  const visibleColumns = useMemo(
    () => allColumns.filter((c) => visibleState.has(c.id)),
    [allColumns, visibleState],
  );

  // ─── URL write helper ──────────────────────────────────────────────
  const writeUrl = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // ─── Derived rows: filter → sort → paginate ────────────────────────
  const filtered = useMemo(
    () => filterDashboardTasks(rows, query),
    [rows, query],
  );
  const sorted = useMemo(
    () => sortDashboardTasks(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  // ─── Handlers ──────────────────────────────────────────────────────
  const onSort = (key: DashboardTaskSortKey) => {
    if (key === sortKey) {
      writeUrl({ sort: key, dir: sortDir === "asc" ? "desc" : "asc", page: "1" });
    } else {
      writeUrl({ sort: key, dir: "asc", page: "1" });
    }
  };

  const onToggleColumn = (id: string) => {
    const next = new Set(visibleState);
    if (next.has(id)) {
      if (next.size === 1) return; // keep at least one column visible
      next.delete(id);
    } else {
      next.add(id);
    }
    setVisibleState(next);
    writeUrl({ cols: next.size === allIds.length ? null : Array.from(next).join(",") });
  };

  const onShowAll = () => {
    setVisibleState(new Set(allIds));
    writeUrl({ cols: null });
  };

  const onHideAll = () => {
    // Keep the "task" column visible — the table is useless without it.
    setVisibleState(new Set(["task"]));
    writeUrl({ cols: "task" });
  };

  const onQueryChange = (next: string) => {
    writeUrl({ q: next || null, page: "1" });
  };

  const onPageChange = (next: number) => {
    writeUrl({ page: String(next) });
  };

  const onPageSizeChange = (next: number) => {
    writeUrl({ size: String(next), page: "1" });
  };

  const countLabel = `${sorted.length}/${rows.length}`;

  return (
    <Card className="glass-card animate-fade-up opacity-0" style={{ animationDelay: "60ms" }}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="font-display text-xl font-normal tracking-tight">
          {labels.title}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <TableSearch
            value={query}
            onChange={onQueryChange}
            placeholder={labels.search}
            countLabel={countLabel}
            className="w-56"
          />
          <TableColumnToggle
            columns={columnDefs}
            visible={visibleState}
            onToggle={onToggleColumn}
            onShowAll={onShowAll}
            onHideAll={onHideAll}
            triggerLabel={labels.columns}
            showAllLabel={labels.showAll}
            hideAllLabel={labels.hideAll}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {paged.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12.5px] text-muted-foreground">
            {labels.noResults}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table
                className="w-full text-[12.5px]"
                style={{
                  tableLayout: "fixed",
                  minWidth: 720,
                }}
              >
                <colgroup>
                  {visibleColumns.map((c) => (
                    <col key={c.id} style={{ width: COLUMN_WIDTHS[c.id] ?? "auto" }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {visibleColumns.map((col) => {
                      const isActive = col.sortKey && col.sortKey === sortKey;
                      const ariaSort = isActive
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none";
                      return (
                        <th
                          key={col.id}
                          scope="col"
                          aria-sort={ariaSort}
                          className={cn(
                            "px-3 py-2 font-medium",
                            col.align === "right" && "text-right",
                          )}
                        >
                          {col.sortKey ? (
                            <button
                              type="button"
                              onClick={() => onSort(col.sortKey as DashboardTaskSortKey)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.12em] transition-colors",
                                isActive
                                  ? "text-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {col.label}
                              {isActive ? (
                                sortDir === "asc" ? (
                                  <ArrowUp className="size-3" />
                                ) : (
                                  <ArrowDown className="size-3" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 opacity-40" />
                              )}
                            </button>
                          ) : (
                            col.label
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((row) => (
                    <tr
                      key={row.id}
                      id={`row-${row.id}`}
                      data-focus={focusId === row.id ? "true" : undefined}
                      data-task-row
                      onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onRowClick(row.id);
                              }
                            }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? "button" : undefined}
                      aria-label={onRowClick ? interpolate(labels.openTask, { title: row.title }) : undefined}
                      className={cn(
                        "align-top transition-colors hover:bg-secondary/30",
                        focusId === row.id && "bg-primary/5",
                        onRowClick && "cursor-pointer focus:bg-secondary/40 focus:outline-none",
                      )}
                    >
                      {visibleColumns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            "px-3 py-3",
                            col.align === "right" && "text-right",
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 p-3 md:hidden">
              {paged.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <div className="space-y-1.5">
                    <p className="text-[13px] font-medium">{row.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {row.projectName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral" size="sm">
                        {labels.statusLabels[row.status]}
                      </Badge>
                      <PriorityBadge
                        priority={PRIORITY_BUCKET[row.priority]}
                        label={labels.priorityLabels[row.priority]}
                      />
                      <div className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="flex size-5 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                          style={{ backgroundColor: row.assigneeColor }}
                        >
                          {row.assigneeInitials}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {row.assigneeName}
                        </span>
                      </div>
                    </div>
                    {row.blocked ? (
                      <BlockerExpandableRow
                        taskId={row.id}
                        blockerNote={row.blockerNote ?? ""}
                        title={row.title}
                        blockedLabel={labels.blockerTitle}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <TablePagination
          page={safePage}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          rowsPerPageLabel={labels.rowsPerPage}
          pageLabel={labels.page}
          ofLabel={labels.of}
          showingLabel={labels.showing}
        />
      </CardContent>
    </Card>
  );
}
