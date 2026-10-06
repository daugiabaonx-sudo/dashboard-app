"use client";

// "Blocker & Decision" — expandable, sortable table (html lines 6769-6793 +
// inline script 7562-7717). One row open at a time.

import { Fragment, useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { SxAction, SxBlocker, SxEmployee, SxProject } from "@/lib/sx-dashboard";

type SortCol = "issue" | "severity" | "days" | "action";

const SEV_ORDER = { high: 0, medium: 1 } as const;
const ACTION_MAP: Record<SxAction, { label: string; cls: string }> = {
  Approve: { label: "Approve", cls: "action-approve" },
  Escalate: { label: "Escalate", cls: "action-escalate" },
  Assign: { label: "Assign", cls: "action-assign" },
  "Waiting External": { label: "Waiting", cls: "action-waiting" },
  "No Action": { label: "–", cls: "action-none" },
};
const COLUMNS: { col: SortCol; label: string }[] = [
  { col: "issue", label: "Vấn đề" },
  { col: "severity", label: "Mức độ" },
  { col: "days", label: "Ngày" },
  { col: "action", label: "Action" },
];

interface Props {
  blockers: SxBlocker[];
  employees: SxEmployee[];
  projects: SxProject[];
  onViewAll: () => void;
}

export function SxBlockerCard({ blockers, employees, projects, onViewAll }: Props) {
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const projById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // window.refreshBlkTable resets the open row whenever the data changes.
  useEffect(() => setExpandedId(null), [blockers]);

  const sorted = useMemo(() => {
    if (!sort) return blockers;
    const key = (b: SxBlocker): string | number => {
      switch (sort.col) {
        case "issue":
          return b.issue;
        case "severity":
          return SEV_ORDER[b.severity];
        case "days":
          return b.daysBlocked;
        case "action":
          return b.actionRequired;
      }
    };
    return [...blockers].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "vi", { sensitivity: "base" });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [blockers, sort]);

  return (
    <article className="panel blocker-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <ShieldAlert className="panel-title-icon" />
          Blocker &amp; Decision
        </h2>
        <button className="view-all" id="blockerViewButton" onClick={onViewAll}>
          Tất cả <span>→</span>
        </button>
      </div>
      <div className="blk-table-wrap">
        <table className="blk-expand-table" id="blkExpandTable">
          <thead>
            <tr>
              <th className="blk-th blk-th-chevron" />
              {COLUMNS.map(({ col, label }) => {
                const active = sort?.col === col;
                return (
                  <th
                    key={col}
                    className={active ? `blk-th blk-sortable sort-${sort.dir}` : "blk-th blk-sortable"}
                    data-sort={col}
                    onClick={() => setSort((s) => ({ col, dir: s?.col === col && s.dir === "asc" ? "desc" : "asc" }))}
                  >
                    {label} <span className="sort-icon">{active ? (sort.dir === "asc" ? "↑" : "↓") : "⇅"}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody id="blkTableBody">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "22px", color: "rgba(240,243,248,.35)", fontSize: "11px" }}>
                  Không có blocker nào ✓
                </td>
              </tr>
            )}
            {sorted.map((blk, i) => {
              const emp = empById.get(blk.employeeId);
              const projName = projById.get(blk.projectId)?.name ?? blk.projectId;
              const action = ACTION_MAP[blk.actionRequired] ?? ACTION_MAP["No Action"];
              const isOpen = expandedId === blk.id;
              return (
                <Fragment key={blk.id}>
                  <tr
                    className={isOpen ? "blk-main-row blk-expanded" : "blk-main-row"}
                    data-id={blk.id}
                    style={{ animationDelay: `${i * 0.045}s` }}
                    onClick={() => setExpandedId(isOpen ? null : blk.id)}
                  >
                    <td className="blk-td-chevron">
                      <span className="blk-chevron">›</span>
                    </td>
                    <td className="blk-td-issue">
                      <div className="blk-issue-text" title={blk.issue}>
                        {blk.issue || "—"}
                      </div>
                      <div className="blk-proj-chip">{projName}</div>
                    </td>
                    <td className="blk-td-sev">
                      <span className={`blk-sev ${blk.severity === "high" ? "blk-sev-high" : "blk-sev-medium"}`}>{blk.severity === "high" ? "HIGH" : "MED"}</span>
                    </td>
                    <td className="blk-td-days">
                      <span className="blk-days-pill">{blk.daysBlocked}d</span>
                    </td>
                    <td className="blk-td-action">
                      <span className={`blk-action ${action.cls}`}>{action.label}</span>
                    </td>
                  </tr>
                  <tr className={isOpen ? "blk-expand-row blk-open" : "blk-expand-row"} data-exp-for={blk.id}>
                    <td colSpan={5}>
                      <div className="blk-expand-content">
                        <div className="blk-detail-grid">
                          <Detail label="Task" value={blk.taskTitle || "—"} />
                          <Detail label="Owner" value={emp ? emp.name : blk.employeeId || "—"} />
                          <Detail label="Dự án" value={projName || "—"} />
                          <Detail label="Thời gian" value={`${blk.daysBlocked} ngày`} />
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div id="blockerList" style={{ display: "none" }} />
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="blk-detail-item">
      <span className="blk-detail-label">{label}</span>
      <span className="blk-detail-value">{value}</span>
    </div>
  );
}
