"use client";

// Building blocks shared by the template's sidebar page views
// (assets/js/sidebar.js): `.page-view` wrapper, slim hero, animated
// progress bar and the priority / status badge configs (ui.js).

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUp, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { SxPriority } from "@/lib/sx-dashboard";

export const PRIORITY_CONFIG: Record<SxPriority, { label: string; cls: string; Icon: LucideIcon }> = {
  high: { label: "Cao", cls: "high", Icon: ArrowUp },
  medium: { label: "Trung bình", cls: "medium", Icon: TriangleAlert },
  low: { label: "Thấp", cls: "low", Icon: Info },
};

const VIEW_STYLE: CSSProperties = { height: "100%", overflow: "auto", padding: "6px 2px" };

export function SxPageView({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="page-view reveal" style={{ ...VIEW_STYLE, ...style }}>
      {children}
    </div>
  );
}

export function SxPageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hero" style={{ marginBottom: 18, flex: "0 0 auto" }}>
      <div>
        <h1 style={{ fontSize: "clamp(22px,2vw,28px)", margin: "0 0 4px" }}>{title}</h1>
        {subtitle !== undefined && (
          <p style={{ margin: 0, color: "var(--sx-text-secondary)", fontSize: 12 }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/** ui.js#animateProgressBars — bars grow from 0 to their value on mount. */
export function SxProgress({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(value), 50);
    return () => window.clearTimeout(id);
  }, [value]);
  return (
    <div className="progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${shown}%` }} />
      </div>
      <span>{value}%</span>
    </div>
  );
}

/** Small stat tile used inside project / employee cards. */
export function SxStatTile({
  value,
  label,
  color = "var(--sx-text)",
  bg,
  compact = false,
}: {
  value: ReactNode;
  label: string;
  color?: string;
  bg: string;
  compact?: boolean;
}) {
  return (
    <div style={{ padding: compact ? 6 : 8, background: bg, borderRadius: compact ? 7 : 8 }}>
      <div style={{ fontSize: compact ? 16 : 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ color: "var(--sx-text-muted)" }}>{label}</div>
    </div>
  );
}
