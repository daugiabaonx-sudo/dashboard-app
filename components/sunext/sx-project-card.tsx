"use client";

// "Tiến độ theo dự án" — animated, sortable, paginated table (html lines
// 6724-6766 + inline script 7350-7559).

import { useEffect, useMemo, useState } from "react";
import { ChartNoAxesColumn } from "lucide-react";
import type { SxHealth, SxProject, SxProjectHealth } from "@/lib/sx-dashboard";

type SortCol = "name" | "progress" | "deadline" | "tasks" | "health";

const HEALTH_ORDER: Record<SxHealth, number> = { blocked: 0, at_risk: 1, on_track: 2 };
const HEALTH_CFG: Record<SxHealth, { label: string; cls: string }> = {
  on_track: { label: "On Track", cls: "health-on-track" },
  at_risk: { label: "At Risk", cls: "health-at-risk" },
  blocked: { label: "Blocked", cls: "health-blocked" },
};
const COLUMNS: { col: SortCol; label: string }[] = [
  { col: "name", label: "Dự án" },
  { col: "progress", label: "Tiến độ" },
  { col: "deadline", label: "Deadline" },
  { col: "tasks", label: "Tasks" },
  { col: "health", label: "Tình trạng" },
];

function fmtShortDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

interface RowProps {
  ph: SxProjectHealth;
  name: string;
  color: string;
  index: number;
}

function ProjRow({ ph, name, color, index }: RowProps) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(ph.progress));
    return () => cancelAnimationFrame(raf);
  }, [ph.progress]);
  const h = HEALTH_CFG[ph.health] ?? HEALTH_CFG.on_track;
  return (
    <tr className="proj-anim-row" style={{ animationDelay: `${index * 0.04}s` }}>
      <td>
        <div className="proj-name-cell">
          <span className="proj-dot-sm" style={{ background: color }} />
          <span className="proj-name-text" title={name}>
            {name}
          </span>
        </div>
      </td>
      <td style={{ minWidth: "120px" }}>
        <div className="proj-bar-cell">
          <div className="proj-mini-track">
            <div className="proj-mini-fill" data-progress={ph.progress} style={{ width: `${width}%`, background: color }} />
          </div>
          <span className="proj-pct-text">{ph.progress}%</span>
        </div>
      </td>
      <td style={{ fontSize: "10px", color: "rgba(240,243,248,.65)" }}>{fmtShortDate(ph.deadline)}</td>
      <td>
        <span className="proj-tasks-cell">
          <span className="proj-tasks-done">{ph.tasksDone}</span>/{ph.tasksTotal}
        </span>
      </td>
      <td>
        <span className={`proj-health-badge ${h.cls}`}>{h.label}</span>
      </td>
    </tr>
  );
}

export function SxProjectCard({ rows, projects }: { rows: SxProjectHealth[]; projects: SxProject[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" } | null>(null);
  const projById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const nameOf = (id: string) => projById.get(id)?.name ?? id;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const key = (r: SxProjectHealth): string | number => {
      switch (sort.col) {
        case "name":
          return projById.get(r.projectId)?.name ?? r.projectId;
        case "progress":
          return r.progress;
        case "deadline":
          return r.deadline || "";
        case "tasks":
          return r.tasksDone;
        case "health":
          return HEALTH_ORDER[r.health] ?? 0;
      }
    };
    return [...rows].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "vi", { sensitivity: "base" });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, projById]);

  const total = sorted.length;
  const ps = pageSize >= total ? total : pageSize;
  const pages = ps > 0 ? Math.ceil(total / ps) : 1;
  const start = (page - 1) * ps;
  const slice = sorted.slice(start, start + ps);
  const infoStart = Math.min(start + 1, total);
  const infoEnd = Math.min(page * ps, total);
  const renderKey = `${page}-${pageSize}-${sort?.col ?? ""}-${sort?.dir ?? ""}`;

  function onSort(col: SortCol) {
    setSort((s) => ({ col, dir: s?.col === col && s.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  return (
    <article className="panel project-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <ChartNoAxesColumn className="panel-title-icon" />
          Tiến độ theo dự án
        </h2>
        <div className="proj-pager-size">
          Hiện:
          <select
            id="projPageSize"
            className="proj-size-select"
            value={pageSize}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setPageSize(Number.isNaN(v) ? 4 : v);
              setPage(1);
            }}
          >
            <option value="2">2</option>
            <option value="4">4</option>
            <option value="8">Tất cả</option>
          </select>
        </div>
      </div>

      <div className="proj-table-wrap">
        <table className="proj-anim-table" id="projAnimTable">
          <thead>
            <tr>
              {COLUMNS.map(({ col, label }) => {
                const active = sort?.col === col;
                return (
                  <th key={col} className={active ? `proj-th sort-${sort.dir}` : "proj-th"} data-sort={col} onClick={() => onSort(col)}>
                    {label} <span className="sort-icon">{active ? (sort.dir === "asc" ? "↑" : "↓") : "⇅"}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody id="projTableBody">
            {slice.map((ph, i) => (
              <ProjRow
                key={`${ph.projectId}-${renderKey}`}
                ph={ph}
                name={nameOf(ph.projectId)}
                color={projById.get(ph.projectId)?.color ?? "#7b2ff2"}
                index={i}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="proj-pagination" id="projPagination">
        <span className="proj-page-info" id="projPageInfo">
          {`${infoStart}–${infoEnd} / ${total} dự án`}
        </span>
        <div className="proj-page-btns">
          <button className="proj-page-btn" id="projPrev" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ‹
          </button>
          <div className="proj-page-nums" id="projPageNums">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} className={n === page ? "proj-page-num active" : "proj-page-num"} onClick={() => setPage(n)}>
                {n}
              </button>
            ))}
          </div>
          <button className="proj-page-btn" id="projNext" aria-label="Trang sau" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            ›
          </button>
        </div>
      </div>
    </article>
  );
}
