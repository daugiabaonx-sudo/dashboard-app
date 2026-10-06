"use client";

// "Dự án" view — port of sidebar.js#buildProjectsView. Each card links to
// the existing project detail page (/projects/[id]).

import Link from "next/link";
import { useMemo } from "react";
import type { SxDataset } from "@/lib/sx-dashboard";
import { projectCards } from "@/lib/sx-views";
import { SxPageHero, SxPageView, SxStatTile } from "./sx-page-view";
import { useSxTaskStore } from "./use-sx-task-store";

const LINK_STYLE = { padding: 18, cursor: "pointer", display: "block", color: "inherit", textDecoration: "none" } as const;

export function SxProjectsView({ dataset }: { dataset: SxDataset }) {
  const { tasks } = useSxTaskStore(dataset);
  const cards = useMemo(() => projectCards(dataset, tasks), [dataset, tasks]);

  return (
    <SxPageView>
      <SxPageHero title="Dự án" subtitle={`${cards.length} dự án đang hoạt động`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14, alignContent: "start" }}>
        {cards.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="panel" style={LINK_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span
                style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, flex: "0 0 auto", boxShadow: `0 0 8px ${p.color}66` }}
              />
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--sx-text)" }}>{p.name}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 99,
                  background: "rgba(39,224,179,.12)",
                  color: "#27e0b3",
                  whiteSpace: "nowrap",
                }}
              >
                Đang chạy
              </span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--sx-text-secondary)", marginBottom: 5 }}>
                <span>Tiến độ</span>
                <span style={{ fontWeight: 700, color: "var(--sx-text)" }}>{p.pct}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: "rgba(119,151,199,.14)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: "inherit",
                    width: `${p.pct}%`,
                    background: `linear-gradient(90deg,${p.color},${p.color}aa)`,
                    transition: "width .8s cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontSize: 10, textAlign: "center" }}>
              <SxStatTile value={p.total} label="Tổng CV" bg="rgba(119,151,199,.06)" />
              <SxStatTile value={p.done} label="Hoàn thành" color="#27e0b3" bg="rgba(39,224,179,.08)" />
              <SxStatTile value={p.overdue} label="Trễ hạn" color="#ff6170" bg="rgba(255,97,112,.08)" />
            </div>
          </Link>
        ))}
      </div>
    </SxPageView>
  );
}
