// components/v2/v2-task-views.ts
// The five "Dự án & Công việc" view types of the V2 template (Bảng, Kanban,
// Gantt, Danh sách, Thẻ) — port of Dashboard Sunext V2/index.html lines
// 2269–2439. Only change: tasks without a deadline are handled.

import type { V2Task } from "@/lib/v2/v2-model";
import { D0, GT_STATE, RK, ST, STO, avatar, bar, dayDiff, esc, pill, type V2Helpers, type V2State } from "./v2-core";

export type V2ViewType = "table" | "kanban" | "list" | "gantt" | "cards";
export type V2GroupKey = "none" | "status" | "project" | "owner" | "team" | "risk";

export interface V2TvState {
  view: V2ViewType;
  group: V2GroupKey;
  sortKey: string;
  dir: number;
  density: "cozy" | "dense";
  status: string[];
  active: string;
  cols: Record<string, boolean>;
}

export interface V2Group {
  key: string;
  raw?: string;
  label: string | null;
  items: V2Task[];
}

export interface V2ViewEnv {
  readonly h: V2Helpers;
  readonly TV: V2TvState;
  readonly collapsed: ReadonlySet<string>;
  readonly canEdit: boolean;
}

export interface V2Column {
  k: string;
  t: string;
  fixed?: number;
  s: (t: V2Task) => string | number;
  r: (t: V2Task) => string;
}

export function taskColumns(h: V2Helpers): V2Column[] {
  return [
    { k: "id", t: "Mã", s: (t) => t.id, r: (t) => `<span class="mono">${t.id}</span>` },
    { k: "title", t: "Công việc", fixed: 1, s: (t) => t.title.toLowerCase(), r: (t) => `<div class="ttl">${esc(t.title)}</div>` },
    { k: "project", t: "Dự án", s: (t) => t.project, r: (t) => esc(t.project) },
    { k: "team", t: "Team", s: (t) => t.team, r: (t) => esc(t.team) },
    { k: "owner", t: "Phụ trách", s: (t) => t.owner, r: (t) => `<div class="who">${avatar(t.owner)}${esc(t.owner)}</div>` },
    { k: "deadline", t: "Hạn", s: (t) => h.dlKey(t), r: (t) => `<span class="${h.isLate(t) ? "dl-late" : ""}">${h.fmtD(t.deadline)}</span>` },
    { k: "risk", t: "Rủi ro", s: (t) => RK[t.risk][2], r: (t) => pill(RK[t.risk][1], RK[t.risk][0]) },
    {
      k: "status",
      t: "Trạng thái",
      s: (t) => STO[h.stateOf(t)],
      r: (t) => {
        const st = h.stateOf(t);
        return pill(ST[st][1], ST[st][0]);
      },
    },
    { k: "progress", t: "Tiến độ", s: (t) => t.progress, r: (t) => bar(t.progress) },
  ];
}

interface GroupDef {
  key: (t: V2Task) => string;
  label: (k: string) => string;
  order?: (k: string) => number;
}

export function groupDefs(h: V2Helpers): Record<Exclude<V2GroupKey, "none">, GroupDef> {
  return {
    status: { key: (t) => h.stateOf(t), label: (k) => ST[k as V2State][0], order: (k) => STO[k as V2State] },
    project: { key: (t) => t.project, label: (k) => k },
    owner: { key: (t) => t.owner, label: (k) => k },
    team: { key: (t) => t.team, label: (k) => k },
    risk: {
      key: (t) => t.risk,
      label: (k) => "Rủi ro " + RK[k as keyof typeof RK][0].toLowerCase(),
      order: (k) => RK[k as keyof typeof RK][2],
    },
  };
}

export function groupList(h: V2Helpers, group: V2GroupKey, list: V2Task[]): V2Group[] {
  const g = group === "none" ? undefined : groupDefs(h)[group];
  if (!g) return [{ key: "all", label: null, items: list }];
  const m = new Map<string, V2Task[]>();
  list.forEach((t) => {
    const k = g.key(t);
    if (!m.has(k)) m.set(k, []);
    m.get(k)?.push(t);
  });
  return [...m.entries()]
    .map(([k, items]) => ({ key: String(k), raw: k, label: g.label(k), items }))
    .sort((a, b) => (g.order ? g.order(a.raw) - g.order(b.raw) : a.label.localeCompare(b.label, "vi")));
}

/* --- Tiêu đề nhóm: thành viên + tiến độ trung bình --- */
function gHead(env: V2ViewEnv, g: V2Group) {
  const { h, TV } = env;
  const n = g.items.length;
  const avg = Math.round(g.items.reduce((a, t) => a + t.progress, 0) / n);
  const done = g.items.filter((t) => t.status === "done").length;
  const att = g.items.filter(h.needsAtt).length;
  const soon = g.items.filter(h.isSoon).length;
  const who = TV.group === "owner" ? avatar(g.raw ?? "") : "";
  const tone = att ? "var(--bad)" : avg >= 70 ? "var(--ok)" : "var(--indigo-500)";
  return `${who}<span class="gl">${esc(g.label)}</span><span class="gtag">${n} việc · ${done} xong</span>${att ? `<span class="gtag g-bad">${att} cần chú ý</span>` : ""}${soon ? `<span class="gtag g-warn">${soon} sắp đến hạn</span>` : ""}<span class="gbar" style="--c:${tone}"><span class="bar"><span style="width:${avg}%"></span></span><i>${avg}%</i></span>`;
}

/* --- Bảng --- */
export function tvTable(env: V2ViewEnv, groups: V2Group[]) {
  const { h, TV, collapsed } = env;
  const cols = taskColumns(h).filter((c) => c.fixed || TV.cols[c.k]);
  const head =
    "<tr>" +
    cols
      .map(
        (c) =>
          `<th class="sortable ${TV.sortKey === c.k ? "sorted" : ""}" data-tvsort="${c.k}">${c.t}<span class="si">${TV.sortKey === c.k ? (TV.dir > 0 ? "↑" : "↓") : "⇅"}</span></th>`,
      )
      .join("") +
    "</tr>";
  let body = "";
  groups.forEach((g) => {
    const closed = collapsed.has(g.key);
    if (g.label !== null)
      body += `<tr class="grp ${closed ? "closed" : ""}" data-grp="${esc(g.key)}"><td colspan="${cols.length}"><div class="gh-in"><span class="chev">›</span>${gHead(env, g)}</div></td></tr>`;
    if (!closed)
      g.items.forEach((t) => {
        body +=
          `<tr class="row ${h.needsAtt(t) ? "att-row" : ""} ${h.stateOf(t) === "done" ? "done-row" : ""}" data-task="${t.id}" tabindex="0">` +
          cols.map((c) => `<td>${c.r(t)}</td>`).join("") +
          "</tr>";
      });
  });
  return `<div class="panel"><div class="tw"><table class="tvt ${TV.density}"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
}

/* --- Thẻ công việc dùng cho Kanban và Thẻ --- */
function kcard(h: V2Helpers, t: V2Task, drag: boolean) {
  return `<div class="kcard" ${drag ? 'draggable="true"' : ""} data-task="${t.id}" tabindex="0">
    <div class="kt">${esc(t.title)}</div>
    <div class="km"><span class="kp">${esc(t.project)}</span><span class="mono">${t.id}</span></div>
    <div class="kf">${avatar(t.owner)}<span class="kdue ${h.isLate(t) ? "dl-late" : ""}">${h.fmtD(t.deadline)}</span>${pill(RK[t.risk][1], RK[t.risk][0])}</div>
    ${bar(t.progress)}</div>`;
}

/* --- Kanban --- */
export function tvKanban(env: V2ViewEnv, list: V2Task[]) {
  const { h, TV } = env;
  const byStatus = TV.group === "none" || TV.group === "status";
  const drag = byStatus && env.canEdit;
  type Col = { key: string; label: string; cls?: string; status: boolean; items: V2Task[] };
  const cols: Col[] = byStatus
    ? (["todo", "working", "overdue", "blocked", "done"] as V2State[])
        .filter((k) => !TV.status.length || TV.status.includes(k))
        .map((k) => ({ key: k, label: ST[k][0], cls: ST[k][1], status: true, items: list.filter((t) => h.stateOf(t) === k) }))
    : groupList(h, TV.group, list).map((g) => ({ key: g.key, label: g.label ?? "", status: false, items: g.items }));
  const dot = (c: Col) => (c.status ? `<i class="kd ${c.cls}"></i>` : "");
  const hint = !byStatus
    ? ""
    : env.canEdit
      ? '<p class="kb-hint">Kéo thả thẻ giữa các cột để đổi trạng thái trên Microsoft Planner. Cột “Trễ hạn” tự tính theo hạn chót nên không thể thả vào.</p>'
      : '<p class="kb-hint">Chế độ chỉ xem — chỉ Owner, Admin hoặc Manager được đổi trạng thái công việc.</p>';
  return (
    `<div class="kb ${TV.density}">` +
    cols
      .map(
        (c) =>
          `<div class="kcol" data-col="${esc(c.key)}" data-status="${c.status ? 1 : 0}"><div class="kh">${dot(c)}<b>${esc(c.label)}</b><em>${c.items.length}</em></div><div class="kbody">${c.items.map((t) => kcard(h, t, drag)).join("") || '<div class="kempty">Không có công việc</div>'}</div></div>`,
      )
      .join("") +
    "</div>" +
    hint
  );
}

/* --- Gantt: tiến độ thành viên theo từng dự án --- */
export function tvGantt(env: V2ViewEnv, list: V2Task[]) {
  const { h, TV, collapsed } = env;
  if (!list.length) return '<div class="panel"><div class="empty">Không có công việc phù hợp với view này.</div></div>';
  const group = TV.group === "none" ? "project" : TV.group;
  const groups = groupList(h, group, list).map((g) => ({
    ...g,
    items: [...g.items].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)),
  }));
  const dense = TV.density === "dense";
  const PX = dense ? 18 : 24;
  const LW = 250;
  const TODAY = h.TODAY;
  const min = new Date(Math.min(TODAY.getTime(), ...list.map((t) => D0(t.start).getTime())));
  const max = new Date(Math.max(TODAY.getTime(), ...list.map((t) => D0(h.endOf(t)).getTime())));
  min.setDate(min.getDate() - ((min.getDay() + 6) % 7));
  max.setDate(max.getDate() + ((7 - max.getDay()) % 7) + 1);
  const days = dayDiff(min, max) + 1;
  const W = days * PX;
  const x = (d: Date | string) => dayDiff(min, d instanceof Date ? d : D0(d)) * PX;
  /* tiêu đề: tháng + tuần */
  let months = "";
  let weeks = "";
  let cur: number | null = null;
  let mStart = 0;
  const mName = (d: Date) => `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  for (let i = 0; i < days; i++) {
    const d = new Date(min);
    d.setDate(d.getDate() + i);
    const key = d.getMonth();
    if (cur === null) {
      cur = key;
      mStart = i;
    }
    if (key !== cur || i === days - 1) {
      const end = key !== cur ? i : i + 1;
      const m0 = new Date(min);
      m0.setDate(m0.getDate() + mStart);
      months += `<span style="left:${mStart * PX}px;width:${(end - mStart) * PX}px"><b>${mName(m0)}</b></span>`;
      cur = key;
      mStart = i;
    }
    if (d.getDay() === 1)
      weeks += `<span style="left:${i * PX}px;width:${7 * PX}px">${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}</span>`;
  }
  const tx = x(TODAY) + PX / 2;
  let rows = "";
  groups.forEach((g) => {
    const closed = collapsed.has(g.key);
    const n = g.items.length;
    const avg = Math.round(g.items.reduce((a, t) => a + t.progress, 0) / n);
    const gs = Math.min(...g.items.map((t) => x(t.start)));
    const ge = Math.max(...g.items.map((t) => x(h.endOf(t)) + PX));
    const people = [...new Set(g.items.map((t) => t.owner))];
    rows += `<div class="gt-r gt-g" data-grp="${esc(g.key)}"><div class="gt-l"><span class="chev ${closed ? "" : "o"}">›</span><b>${esc(g.label)}</b><em>${n} việc · ${people.length} người · TB ${avg}%</em></div><div class="gt-t"><div class="gt-span" style="left:${gs}px;width:${ge - gs}px"><i style="width:${avg}%"></i></div></div></div>`;
    if (!closed)
      g.items.forEach((t) => {
        const st = h.stateOf(t);
        const w = Math.max(PX, x(h.endOf(t)) - x(t.start) + PX);
        const tip = `${t.id} · ${t.title} · ${h.fmtD(t.start)} → ${h.fmtD(t.deadline)} · ${t.progress}%`;
        rows += `<div class="gt-r"><div class="gt-l"><div class="who">${avatar(t.owner)}<div class="gn"><b>${esc(t.owner)}</b><small>${esc(t.title)}</small></div></div></div><div class="gt-t"><div class="gt-bar" data-task="${t.id}" tabindex="0" title="${esc(tip)}" style="left:${x(t.start)}px;width:${w}px;--c:${GT_STATE[st]}"><i style="width:${t.progress}%"></i><span>${w >= 64 ? t.progress + "%" : ""}</span></div></div></div>`;
      });
  });
  const legend = (
    [
      ["working", "Đang làm"],
      ["overdue", "Trễ hạn"],
      ["blocked", "Bị chặn"],
      ["done", "Hoàn thành"],
      ["todo", "Chưa bắt đầu"],
    ] as const
  )
    .map(([k, l]) => `<span><i style="background:${GT_STATE[k]}"></i>${l}</span>`)
    .join("");
  const todayIso = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-${String(TODAY.getDate()).padStart(2, "0")}`;
  return `<div class="panel gt"><div class="gt-legend">${legend}<span class="gt-today"><i></i>Hôm nay ${h.fmtD(todayIso)}</span><em>Thanh đậm = tiến độ hoàn thành · bấm vào thanh để xem chi tiết</em></div>
  <div class="gt-scroll" data-today="${Math.round(tx)}"><div class="gt-in ${dense ? "dense" : ""}" style="width:${LW + W}px;--lw:${LW}px;--px:${PX}px">
    <div class="gt-r gt-h"><div class="gt-l">Dự án · Thành viên</div><div class="gt-t"><div class="gt-m">${months}</div><div class="gt-w">${weeks}</div></div></div>
    ${rows}
    <div class="gt-line" style="left:${LW + tx}px"></div>
  </div></div></div>`;
}

/* --- Danh sách gọn --- */
export function tvListView(env: V2ViewEnv, groups: V2Group[]) {
  const { h, TV, collapsed } = env;
  const dotCls = (t: V2Task) => ({ done: "p-ok", working: "p-work", overdue: "p-bad", blocked: "p-block", todo: "p-mute" })[h.stateOf(t)];
  const showOwner = TV.group !== "owner";
  /* trọng tâm: nhóm có nhiều việc cần chú ý lên trước, việc gấp lên đầu, việc đã xong xuống cuối */
  const score = (g: V2Group) => g.items.filter(h.needsAtt).length * 100 + g.items.filter(h.isSoon).length * 10;
  const gs =
    TV.group === "owner" || TV.group === "project" || TV.group === "team"
      ? [...groups].sort((a, b) => score(b) - score(a) || (a.label ?? "").localeCompare(b.label ?? "", "vi"))
      : groups;
  let html = `<div class="panel"><div class="lv ${TV.density} ${showOwner ? "" : "no-owner"}">`;
  gs.forEach((g) => {
    const closed = collapsed.has(g.key);
    if (g.label !== null) html += `<div class="lgh" data-grp="${esc(g.key)}"><span class="chev ${closed ? "" : "o"}">›</span>${gHead(env, g)}</div>`;
    if (closed) return;
    [...g.items]
      .sort((a, b) => h.prio(a) - h.prio(b) || h.dlKey(a).localeCompare(h.dlKey(b)))
      .forEach((t) => {
        const st = h.stateOf(t);
        const att = h.needsAtt(t);
        const tag = st === "blocked" ? pill(ST[st][1], ST[st][0]) : st === "todo" ? '<span class="pill p-mute">Chưa làm</span>' : "";
        html += `<div class="lr st-${st} ${att ? "att" : ""}" data-task="${t.id}" tabindex="0"><i class="kd ${dotCls(t)}"></i>
        <div class="ltb"><span class="lt">${esc(t.title)}</span><small><span class="mono">${t.id}</span> · ${esc(t.project)}${t.risk === "critical" ? ' · <b class="t-bad">Critical</b>' : ""}</small></div>
        ${showOwner ? `<div class="who">${avatar(t.owner)}${esc(t.owner)}</div>` : ""}
        <span class="ltag">${tag}</span>${h.dueTxt(t)}<div class="lpg pc-${st}">${bar(t.progress)}</div></div>`;
      });
  });
  return html + "</div></div>";
}

/* --- Lưới thẻ --- */
export function tvCards(env: V2ViewEnv, groups: V2Group[]) {
  let html = `<div class="cg ${env.TV.density}">`;
  groups.forEach((g) => {
    if (g.label !== null) html += `<div class="cgh">${esc(g.label)}<em>${g.items.length}</em></div>`;
    g.items.forEach((t) => {
      html += kcard(env.h, t, false);
    });
  });
  return html + "</div>";
}
