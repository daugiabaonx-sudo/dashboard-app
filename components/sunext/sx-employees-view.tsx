"use client";

// "Nhân viên" view — port of sidebar.js#buildEmployeesView. Each card links
// to the existing member detail page (/team/[id]).

import Link from "next/link";
import { useMemo } from "react";
import type { SxDataset } from "@/lib/sx-dashboard";
import { employeeCards } from "@/lib/sx-views";
import { SxPageHero, SxPageView, SxStatTile } from "./sx-page-view";
import { useSxTaskStore } from "./use-sx-task-store";

/** Template TEAM_COLORS, extended with a stable fallback palette. */
const TEAM_COLORS: Record<string, string> = {
  "R&D": "#8b5cf6",
  Product: "#27e0b3",
  Engineering: "#1aa7ff",
  Marketing: "#ff8a35",
};
const FALLBACK = ["#7b2ff2", "#24c6ff", "#ffc45d", "#ff6170"];

function teamColor(team: string): string {
  if (TEAM_COLORS[team]) return TEAM_COLORS[team];
  const sum = [...team].reduce((s, c) => s + c.charCodeAt(0), 0);
  return FALLBACK[sum % FALLBACK.length];
}

const LINK_STYLE = { padding: 18, display: "block", color: "inherit", textDecoration: "none", cursor: "pointer" } as const;

export function SxEmployeesView({ dataset }: { dataset: SxDataset }) {
  const { tasks } = useSxTaskStore(dataset);
  const cards = useMemo(() => employeeCards(dataset, tasks), [dataset, tasks]);

  return (
    <SxPageView>
      <SxPageHero title="Nhân viên" subtitle={`${cards.length} nhân viên trong team`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14, alignContent: "start" }}>
        {cards.map((e) => {
          const tc = teamColor(e.team);
          return (
            <Link key={e.id} href={`/team/${e.id}`} className="panel" style={LINK_STYLE}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span className={`avatar ${e.avatar}`} style={{ width: 44, height: 44, fontSize: 11 }}>
                  {e.initials}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--sx-text)" }}>{e.name}</div>
                  <div style={{ fontSize: 10, color: "var(--sx-text-muted)" }}>{e.role}</div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: `${tc}22`,
                      color: tc,
                      marginTop: 3,
                      display: "inline-block",
                    }}
                  >
                    {e.team}
                  </span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, fontSize: 9, textAlign: "center" }}>
                <SxStatTile compact value={e.tasks} label="CV" bg="rgba(119,151,199,.06)" />
                <SxStatTile compact value={e.done} label="Done" color="#27e0b3" bg="rgba(39,224,179,.07)" />
                <SxStatTile compact value={`${e.avgProg}%`} label="Tiến độ" color="#a98cff" bg="rgba(139,92,246,.08)" />
              </div>
            </Link>
          );
        })}
      </div>
    </SxPageView>
  );
}
