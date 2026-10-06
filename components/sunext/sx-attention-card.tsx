"use client";

// "Công việc cần chú ý" — attention table (html lines 6604-6657) with the
// AnimatedTable sort/column-picker script (7224-7347) and the search script
// (7720-7834). Rows are ranked by risk like dashboard.js#renderTaskTable.

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, SearchX } from "lucide-react";
import { daysLabel, riskLabel, riskScore, type SxEmployee, type SxTask } from "@/lib/sx-dashboard";

const MAX_ROWS = 4;
const COLS = ["owner", "deadline", "risk", "status"] as const;
type HideableCol = (typeof COLS)[number];
type SortCol = "title" | HideableCol;

const COL_LABELS: Record<HideableCol, string> = {
  owner: "Owner",
  deadline: "Deadline",
  risk: "Rủi ro",
  status: "Trạng thái",
};

export const STATUS_CONFIG: Record<SxTask["status"], { label: string; cls: string }> = {
  completed: { label: "Hoàn thành", cls: "done" },
  in_progress: { label: "Đang làm", cls: "working" },
  not_started: { label: "Chưa bắt đầu", cls: "working" },
  overdue: { label: "Trễ hạn", cls: "overdue" },
  blocked: { label: "Bị chặn", cls: "overdue" },
};

interface RowView {
  task: SxTask;
  cells: Record<SortCol, string>;
  avatar: string;
  initials: string;
  dlCls: string;
  riskCls: string;
  statusCls: string;
}

function Highlight({ text, term }: { text: string; term: string }) {
  const idx = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

interface Props {
  tasks: SxTask[];
  employees: SxEmployee[];
  now: Date;
  onOpenTask: (id: string) => void;
}

export function SxAttentionCard({ tasks, employees, now, onOpenTask }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc"; version: number } | null>(null);
  const [hidden, setHidden] = useState<Set<HideableCol>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [term, setTerm] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Topbar filter changes reset "view all" (app.js#onFilterChange).
  useEffect(() => setShowAll(false), [tasks]);

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(searchInput.trim()), 120);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!pickerRef.current?.contains(target) && !toggleRef.current?.contains(target)) setPickerOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const rows: RowView[] = useMemo(() => {
    const ranked = [...tasks].sort((a, b) => riskScore(b, now) - riskScore(a, now));
    const visible = showAll ? ranked : ranked.slice(0, MAX_ROWS);
    const views = visible.map((task) => {
      const emp = empById.get(task.employeeId);
      const dl = daysLabel(task, now);
      const risk = riskLabel(task, now);
      const sc = STATUS_CONFIG[task.status];
      return {
        task,
        cells: {
          title: task.title,
          owner: emp ? emp.name.split(" ").slice(-1)[0] : task.employeeId,
          deadline: dl.text,
          risk: risk.label,
          status: sc.label,
        },
        avatar: emp?.avatar ?? "avatar-1",
        initials: emp?.initials ?? "?",
        dlCls: dl.cls,
        riskCls: risk.cls,
        statusCls: sc.cls,
      };
    });
    if (!sort) return views;
    return [...views].sort((a, b) => {
      const cmp = a.cells[sort.col].localeCompare(b.cells[sort.col], "vi", { sensitivity: "base" });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [tasks, empById, now, showAll, sort]);

  const lowerTerm = term.toLowerCase();
  const matches = (r: RowView) => !lowerTerm || Object.values(r.cells).join(" ").toLowerCase().includes(lowerTerm);
  const matchCount = rows.filter(matches).length;

  function onSort(col: SortCol) {
    setSort((s) => ({
      col,
      dir: s?.col === col && s.dir === "asc" ? "desc" : "asc",
      version: (s?.version ?? 0) + 1,
    }));
  }

  function toggleCol(col: HideableCol) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  const th = (col: SortCol, label: string) => {
    const active = sort?.col === col;
    const cls = ["at-th", col !== "title" ? `at-col-${col}` : "", active ? `sort-${sort.dir}` : ""].filter(Boolean).join(" ");
    return (
      <th className={cls} data-sort={col} onClick={() => onSort(col)}>
        {label} <span className="sort-icon">{active ? (sort.dir === "asc" ? "↑" : "↓") : "⇅"}</span>
      </th>
    );
  };

  const tableCls = ["tasks-table", "attention-table", ...COLS.filter((c) => hidden.has(c)).map((c) => `col-hidden-${c}`)].join(" ");

  return (
    <article className="panel attention-card" id="attentionPanel">
      <div className="panel-header">
        <h2 className="panel-title">
          <CircleAlert className="panel-title-icon" />
          Công việc cần chú ý
        </h2>
        <button className="view-all" id="viewAllTasksButton" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Thu gọn " : "Xem tất cả "}
          <span>{showAll ? "↑" : "→"}</span>
        </button>
        <button
          ref={toggleRef}
          className="col-toggle-btn"
          id="colToggleBtn"
          title="Ẩn/hiện cột"
          aria-label="Ẩn/hiện cột"
          aria-expanded={pickerOpen}
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen((v) => !v);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
          </svg>
          Cột
        </button>
        <div className="col-picker" id="colPicker" hidden={!pickerOpen} ref={pickerRef}>
          {COLS.map((col) => (
            <div
              key={col}
              className={hidden.has(col) ? "col-picker-item col-hidden" : "col-picker-item"}
              data-col={col}
              onClick={(e) => {
                e.stopPropagation();
                toggleCol(col);
              }}
            >
              <span className="col-check">✓</span> {COL_LABELS[col]}
            </div>
          ))}
        </div>
      </div>

      <div className="at-search-bar">
        <span className="at-search-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          id="taskSearchInput"
          className="at-search-input"
          placeholder="Tìm theo tên công việc, người phụ trách, trạng thái..."
          autoComplete="off"
          spellCheck={false}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button
          className="at-search-clear"
          id="taskSearchClear"
          aria-label="Xóa tìm kiếm"
          onClick={() => {
            setSearchInput("");
            setTerm("");
            inputRef.current?.focus();
          }}
        >
          ✕
        </button>
      </div>

      <div className="table-wrap" id="taskTableWrap" style={{ display: rows.length ? "block" : "none" }}>
        <table className={tableCls}>
          <thead>
            <tr>
              {th("title", "Công việc")}
              {th("owner", "Owner")}
              {th("deadline", "Deadline")}
              {th("risk", "Rủi ro")}
              {th("status", "Trạng thái")}
            </tr>
          </thead>
          <tbody id="taskTableBody">
            {rows.map((r, i) => (
              <tr
                key={`${r.task.id}-${sort?.version ?? 0}`}
                className={sort ? "task-row row-anim" : "task-row"}
                data-task-id={r.task.id}
                style={{ display: matches(r) ? undefined : "none", animationDelay: sort ? `${i * 0.04}s` : undefined }}
                onClick={() => onOpenTask(r.task.id)}
              >
                <td>
                  <div className="task-title" style={{ whiteSpace: "normal", lineHeight: 1.3, maxWidth: "100%" }}>
                    <Highlight text={r.cells.title} term={term} />
                  </div>
                </td>
                <td>
                  <div className="employee">
                    <span className={`avatar ${r.avatar}`}>{r.initials}</span>
                    <span style={{ fontSize: "9.5px" }}>{r.cells.owner}</span>
                  </div>
                </td>
                <td className={r.dlCls} style={{ fontSize: "10px", fontWeight: 600 }}>
                  {r.cells.deadline}
                </td>
                <td>
                  <span className={`risk-badge ${r.riskCls}`}>{r.cells.risk}</span>
                </td>
                <td>
                  <span className={`status ${r.statusCls}`}>{r.cells.status}</span>
                </td>
              </tr>
            ))}
            {term && matchCount === 0 && rows.length > 0 && (
              <tr id="atNoResults">
                <td colSpan={5} className="at-no-results">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                    <path d="M8 11h6M11 8v6" />
                  </svg>
                  <br />
                  Không tìm thấy &quot;<strong style={{ color: "#c4b5fd" }}>{term}</strong>&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="empty-state" id="emptyState" style={{ display: rows.length ? "none" : "block" }}>
        <SearchX />
        <div>Không tìm thấy công việc phù hợp.</div>
      </div>
    </article>
  );
}
