// components/v2/v2-core.ts
// Constants + render helpers of the SUNEXT Dashboard V2 template
// (Dashboard Sunext V2/index.html, "STATE + HELPERS"). Ported verbatim,
// with two changes for real Planner data:
//   * TODAY is the real current date (the template hard-coded 2026-10-12);
//   * tasks may have no deadline ("") — every date helper guards for it.

import type { V2Task } from "@/lib/v2/v2-model";

export type V2State = "done" | "working" | "overdue" | "blocked" | "todo";

export const NAV = [
  { g: "Làm việc", k: "overview", t: "Tổng quan", i: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
  { k: "tasks", t: "Dự án & Công việc", i: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13l2 2 4-4"/>' },
  { g: "Hệ thống", k: "settings", t: "Cài đặt", i: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>' },
] as const;

export const ICO = {
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  att: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v4M12 16h.01"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.8.7 2.9 2.4 3.2 5"/>',
} as const;

export const ST: Record<V2State, readonly [string, string]> = {
  done: ["Hoàn thành", "p-ok"],
  working: ["Đang làm", "p-work"],
  overdue: ["Trễ hạn", "p-bad"],
  blocked: ["Bị chặn", "p-block"],
  todo: ["Chưa bắt đầu", "p-mute"],
};
export const RK = {
  critical: ["Critical", "p-crit", 0],
  high: ["High", "p-bad", 1],
  medium: ["Medium", "p-warn", 2],
  low: ["Low", "p-ok", 3],
} as const;
export const SEV = { high: ["High", "p-bad", 0], medium: ["Med", "p-warn", 1] } as const;
export const HMAP = {
  onTrack: ["On Track", "p-ok", 0],
  atRisk: ["At Risk", "p-warn", 1],
  blocked: ["Blocked", "p-block", 2],
} as const;
export const STO: Record<V2State, number> = { overdue: 0, blocked: 1, working: 2, todo: 3, done: 4 };
export const GT_STATE: Record<V2State, string> = {
  working: "#5155EA",
  overdue: "#EF5B6B",
  blocked: "#F2873A",
  done: "#22B07D",
  todo: "#9B9CB5",
};
const AV = ["#5155EA", "#7A7FF4", "#3336C1", "#22B07D", "#F2873A", "#EF5B6B"];

/** Sort key for tasks without a deadline: always last when ascending. */
export const NO_DEADLINE_KEY = "9999-12-31";

export const svg = (p: string, s?: string) => `<svg class="i" viewBox="0 0 24 24"${s ? ` style="${s}"` : ""}>${p}</svg>`;
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
export const initials = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .map((w) => [...w][0])
    .slice(-2)
    .join("")
    .toUpperCase();
export const avatarColor = (n: string) => AV[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
export const avatar = (n: string) => `<span class="ava" style="background:${avatarColor(n)}">${esc(initials(n))}</span>`;
export const pill = (cls: string, txt: string) => `<span class="pill ${cls}">${txt}</span>`;
export const bar = (v: number) =>
  `<div class="prog"><div class="bar"><span style="width:${v}%"></span></div><em>${v}%</em></div>`;
export const D0 = (d: string) => new Date(`${d}T00:00:00`);
export const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5);

/** Today at local midnight. */
export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function createHelpers(TODAY: Date) {
  const fmtD = (d: string) => {
    if (!d) return "—";
    const x = D0(d);
    return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
  };
  const fmtFull = (d: string) => (d ? `${fmtD(d)}/${D0(d).getFullYear()}` : "Chưa có hạn");
  const isLate = (t: V2Task) => t.status !== "done" && !!t.deadline && D0(t.deadline) < TODAY;
  const daysLate = (t: V2Task) => (t.deadline ? dayDiff(D0(t.deadline), TODAY) : 0);
  const stateOf = (t: V2Task): V2State =>
    t.status === "done" ? "done" : t.status === "blocked" ? "blocked" : isLate(t) ? "overdue" : t.status === "todo" ? "todo" : "working";
  const daysLeft = (t: V2Task) => (t.deadline ? dayDiff(TODAY, D0(t.deadline)) : Number.POSITIVE_INFINITY);
  const isSoon = (t: V2Task) => {
    const s = stateOf(t);
    const d = daysLeft(t);
    return (s === "working" || s === "todo") && d >= 0 && d <= 3;
  };
  const needsAtt = (t: V2Task) => ["overdue", "blocked"].includes(stateOf(t));
  const prio = (t: V2Task) => {
    const s = stateOf(t);
    return s === "overdue" ? 0 : s === "blocked" ? 1 : isSoon(t) ? 2 : s === "working" ? 3 : s === "todo" ? 4 : 5;
  };
  const dueTxt = (t: V2Task) => {
    const s = stateOf(t);
    const d = daysLeft(t);
    if (s === "done") return '<span class="due d-done">✓ Đã xong</span>';
    if (!t.deadline) return '<span class="due">Chưa có hạn</span>';
    if (d < 0) return `<span class="due d-late">Trễ ${-d} ngày</span>`;
    if (d === 0) return '<span class="due d-soon">Hạn hôm nay</span>';
    if (d <= 3) return `<span class="due d-soon">Còn ${d} ngày</span>`;
    return `<span class="due">Còn ${d} ngày · ${fmtD(t.deadline)}</span>`;
  };
  const pjDue = (d: string) => {
    if (!d) return "chưa có hạn";
    const n = dayDiff(TODAY, D0(d));
    return n < 0
      ? `<b class="t-bad">quá hạn ${-n} ngày</b>`
      : n === 0
        ? '<b class="t-warn">hạn hôm nay</b>'
        : n <= 7
          ? `<b class="t-warn">còn ${n} ngày</b>`
          : `còn ${n} ngày`;
  };
  /** Deadline as a sortable string (no deadline sorts last). */
  const dlKey = (t: V2Task) => t.deadline || NO_DEADLINE_KEY;
  /** Gantt end date: deadline, or the start date when there is none. */
  const endOf = (t: V2Task) => t.deadline || t.start;
  return { TODAY, fmtD, fmtFull, isLate, daysLate, stateOf, daysLeft, isSoon, needsAtt, prio, dueTxt, pjDue, dlKey, endOf };
}

export type V2Helpers = ReturnType<typeof createHelpers>;

export function spark(arr: readonly number[], color: string) {
  const w = 70;
  const h = 28;
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const pts = arr.map((v, i) => [i * (w / (arr.length - 1)), h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><path d="M${pts.map((p) => p.join(",")).join(" L")}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function sortBy<T>(arr: readonly T[], key: string, dir: number, get: (x: T, k: string) => string | number) {
  return [...arr].sort((a, b) => {
    const x = get(a, key);
    const y = get(b, key);
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });
}

export interface V2SortState {
  key: string;
  dir: number;
}

export function headRow(cols: readonly { k: string; t: string; s?: number }[], sortState: V2SortState | null, attr: string) {
  return (
    "<tr>" +
    cols
      .map((c) => {
        const on = sortState && sortState.key === c.k;
        return `<th class="${c.s ? "sortable" : ""} ${on ? "sorted" : ""}" ${c.s ? `data-${attr}="${c.k}"` : ""}>${c.t}${
          c.s ? `<span class="si">${on ? (sortState.dir > 0 ? "↑" : "↓") : "⇅"}</span>` : ""
        }</th>`;
      })
      .join("") +
    "</tr>"
  );
}
