"use client";

// "Sức khỏe tiến độ" — radial ring + 3 bars (html lines 6660-6716,
// dashboard.js#renderDonut). The ring and bars start empty and animate to
// their value on the next frame so the template's CSS transitions run.

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { healthSummary, type SxKpis } from "@/lib/sx-dashboard";
import { useCountUp } from "./sx-hero-stats";

const CIRCUMFERENCE = 2 * Math.PI * 50;

export function SxHealthCard({ kpis }: { kpis: SxKpis }) {
  const summary = healthSummary(kpis);
  const score = useCountUp(summary.score);
  const [drawn, setDrawn] = useState<typeof summary | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(summary));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the numbers change
  }, [summary.score, summary.onTrack, summary.atRisk, summary.blocked]);

  const offset = drawn ? (CIRCUMFERENCE - (drawn.score / 100) * CIRCUMFERENCE).toFixed(2) : undefined;
  const rows = [
    { cls: "hc-stat-on-track", name: "On Track", fill: "hc-fill-on-track", barId: "barOnTrack", pctId: "healthOnTrack", value: summary.onTrack, drawnValue: drawn?.onTrack },
    { cls: "hc-stat-at-risk", name: "At Risk", fill: "hc-fill-at-risk", barId: "barAtRisk", pctId: "healthAtRisk", value: summary.atRisk, drawnValue: drawn?.atRisk },
    { cls: "hc-stat-blocked", name: "Blocked", fill: "hc-fill-blocked", barId: "barBlocked", pctId: "healthBlocked", value: summary.blocked, drawnValue: drawn?.blocked },
  ];

  return (
    <article className="panel health-card status-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Activity className="panel-title-icon" />
          Sức khỏe tiến độ
        </h2>
      </div>
      <div className="hc-body">
        <div className="hc-ring-wrap">
          <svg className="hc-ring-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="hcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle className="hc-ring-track" cx="60" cy="60" r="50" />
            <circle
              className="hc-ring-glow"
              cx="60"
              cy="60"
              r="50"
              strokeDasharray="314"
              strokeDashoffset="314"
              transform="rotate(-90 60 60)"
              style={offset ? { strokeDashoffset: offset } : undefined}
            />
            <circle
              className="hc-ring-fill"
              id="healthRingFill"
              cx="60"
              cy="60"
              r="50"
              strokeDasharray="314"
              strokeDashoffset="314"
              transform="rotate(-90 60 60)"
              style={offset ? { strokeDashoffset: offset } : undefined}
            />
          </svg>
          <div className="hc-ring-center">
            <strong className="hc-score" id="healthScore">
              {score}
            </strong>
            <span className="hc-score-label">Overall</span>
          </div>
        </div>
        <div className="hc-stats">
          {rows.map((r) => (
            <div className={`hc-stat-row ${r.cls}`} key={r.barId}>
              <span className="hc-stat-dot" />
              <span className="hc-stat-name">{r.name}</span>
              <div className="hc-bar-track">
                <div className={`hc-bar-fill ${r.fill}`} id={r.barId} style={{ width: `${r.drawnValue ?? 0}%` }} />
              </div>
              <span className="hc-stat-pct" id={r.pctId}>
                {drawn ? `${r.value}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
