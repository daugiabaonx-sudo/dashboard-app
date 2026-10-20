// components/v2/v2-overview.ts
// "Tổng quan" page + shell (sidebar, topbar, modal) of the V2 template —
// port of Dashboard Sunext V2/index.html lines 1997–2242 wired to real
// Planner data + human-raised Blocker & Decision requests.

import type { DecisionType } from "@/lib/types";
import {
  buildDecisionRows,
  defaultDecisionTab,
  filterRowsByTab,
  sortUnblockerCandidates,
  tabCounts,
  type V2DecisionRow,
  type V2DecisionTab,
  type V2WaitTone,
} from "@/lib/v2/v2-decisions";
import { computeTrend, type V2Status, type V2Task } from "@/lib/v2/v2-model";
import type { V2Ctx, V2View } from "./v2-context";
import {
  HMAP,
  ICO,
  NAV,
  RK,
  ST,
  avatar,
  bar,
  esc,
  headRow,
  pill,
  sortBy,
  spark,
  svg,
} from "./v2-core";

type Health = readonly [string, string, number];

const DAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const KNOWN_VIEWS: Partial<Record<V2View, string>> = { overview: "v-overview", tasks: "v-tasks" };
const WAIT_PILL: Readonly<Record<V2WaitTone, string>> = {
  fresh: "p-ok",
  warn: "p-warn",
  stale: "p-bad",
};

export function filtered(ctx: V2Ctx): V2Task[] {
  const { S, h } = ctx;
  const q = S.q.trim().toLowerCase();
  const inPeriod = (t: V2Task) => {
    if (S.period === "all") return true;
    if (!t.deadline) return false;
    const d = new Date(`${t.deadline}T00:00:00`);
    if (S.period === "month") return d.getMonth() === h.TODAY.getMonth() && d.getFullYear() === h.TODAY.getFullYear();
    const end = new Date(h.TODAY);
    end.setDate(end.getDate() + 6);
    return (d >= h.TODAY && d <= end) || h.isLate(t);
  };
  return ctx.TASKS.filter(
    (t) =>
      (S.team === "all" || t.team === S.team) &&
      (S.project === "all" || t.project === S.project) &&
      inPeriod(t) &&
      (!q || [t.title, t.owner, t.project, t.team, t.id, ST[h.stateOf(t)][0]].join(" ").toLowerCase().includes(q)),
  );
}

export function renderNav(ctx: V2Ctx) {
  let g = "";
  let html = "";
  NAV.forEach((n) => {
    if ("g" in n && n.g !== g) {
      g = n.g;
      html += `<div class="nav-group">${g}</div>`;
    }
    html += `<button class="nav-item ${ctx.S.view === n.k ? "active" : ""}" data-nav="${n.k}" title="${n.t}">${svg(n.i)}<span class="lb">${esc(n.t)}</span></button>`;
  });
  ctx.$("nav").innerHTML = html;
}

function renderHeads(ctx: V2Ctx) {
  const { $, h, model, profile } = ctx;
  $("heroSub").textContent = "Cùng xem tình hình công việc của team trong tuần này nhé!";
  $("heroNote").textContent = "Hãy tập trung vào điều quan trọng nhất";
  $("h-att").innerHTML = svg(ICO.att) + "Công việc cần chú ý";
  $("h-health").innerHTML = svg(ICO.pulse) + "Sức khỏe tiến độ";
  $("h-proj").innerHTML = svg(ICO.bars) + "Tiến độ theo dự án";
  $("h-blk").innerHTML = svg(ICO.shield) + "Blocker &amp; Decision";
  const raiseBtn = $("btnRaiseBlocker");
  if (raiseBtn) raiseBtn.hidden = !ctx.canRaise;
  $("fProj").innerHTML =
    '<option value="all">Tất cả dự án</option>' + ctx.PROJECTS.map((p) => `<option>${esc(p.name)}</option>`).join("");
  $("fTeam").innerHTML =
    '<option value="all">Tất cả team</option>' + model.teams.map((t) => `<option>${esc(t)}</option>`).join("");
  const d = DAYS[h.TODAY.getDay()];
  $("todayTxt").textContent = `${d}, ${String(h.TODAY.getDate()).padStart(2, "0")} Tháng ${h.TODAY.getMonth() + 1} ${h.TODAY.getFullYear()}`;
  // Profile (session) + bell (Planner & Decision notifications).
  $("profAva").textContent = profile.initials;
  $("profName").textContent = profile.name;
  renderBell(ctx);
}

function renderBell(ctx: V2Ctx) {
  const { $, model } = ctx;
  const notes = model.notifications;
  $("bellList").innerHTML = notes.length
    ? notes
        .slice(0, 6)
        .map(
          (n) =>
            `<div class="it"><i style="background:${esc(n.color || "var(--indigo-500)")}"></i><div><b>${esc(n.title)}</b><small>${esc(n.message)}</small></div></div>`,
        )
        .join("")
    : '<div class="it"><i style="background:var(--ok)"></i><div><b>Không có thông báo mới</b><small>Mọi thứ đều ổn.</small></div></div>';
  const dot = ctx.root.querySelector("#bellBtn .dot") as HTMLElement | null;
  if (dot) dot.hidden = notes.length === 0;
}

function countUp(el: HTMLElement & { dataset: DOMStringMap }, to: number) {
  const from = Number(el.dataset.v) || 0;
  el.dataset.v = String(to);
  if (matchMedia("(prefers-reduced-motion:reduce)").matches || from === to) {
    el.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const dur = 600;
  const f = (n: number) => {
    const p = Math.min(1, (n - t0) / dur);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(f);
  };
  f(t0);
}

function renderKpis(ctx: V2Ctx, list: V2Task[]) {
  const c = ctx.h.countStates(list);
  const pctOf = (n: number) => (c.total ? ((n / c.total) * 100).toFixed(1) : 0);
  const { spark: sp, delta: dl } = computeTrend(list, ctx.h.TODAY);
  const cards = [
    { cls: "hero-card", t: "Tổng công việc", ico: ICO.list, v: c.total, d: dl.total, cap: "so với tuần trước", sp: sp.total, col: "#fff" },
    { cls: "k-ok", t: "Đã hoàn thành", ico: ICO.check, v: c.done, d: dl.done, cap: `${pctOf(c.done)}% tổng công việc`, sp: sp.done, col: "#22B07D" },
    { cls: "", t: "Đang thực hiện", ico: ICO.clock, v: c.working, d: dl.work, cap: `${pctOf(c.working)}% tổng công việc`, sp: sp.work, col: "#5155EA" },
    { cls: "", t: "Chưa bắt đầu", ico: ICO.list, v: c.todo, d: dl.todo, cap: `${pctOf(c.todo)}% tổng công việc`, sp: sp.todo, col: "#8B8FA8" },
    { cls: "k-bad", t: "Trễ hạn", ico: ICO.alert, v: c.overdue, d: dl.late, cap: `${pctOf(c.overdue)}% tổng công việc`, sp: sp.late, col: "#EF5B6B" },
    { cls: "k-block", t: "Bị chặn", ico: ICO.pause, v: c.blocked, d: dl.block, cap: `${pctOf(c.blocked)}% tổng công việc`, sp: sp.block, col: "#F2873A" },
  ];
  const box = ctx.$("kpis");
  if (!box.children.length) {
    box.innerHTML = cards
      .map(
        (k, i) =>
          `<article class="kpi ${k.cls}"><div class="top">${k.t}<span class="ico">${svg(k.ico)}</span></div><div class="num"><b data-k="${i}">0</b><span class="delta" data-d="${i}" title="So với 7 ngày trước"></span></div><div class="cap" data-c="${i}"></div>${spark(k.sp, k.col)}</article>`,
      )
      .join("");
  }
  cards.forEach((k, i) => {
    countUp(box.querySelector(`[data-k="${i}"]`), k.v);
    const delta = box.querySelector(`[data-d="${i}"]`);
    delta.textContent = k.d[0];
    delta.className = `delta ${k.d[1]}`;
    box.querySelector(`[data-c="${i}"]`).textContent = k.cap;
    box.children[i].querySelector(".spark").outerHTML = spark(k.sp, k.col);
  });
}

function renderTasks(ctx: V2Ctx, list: V2Task[]) {
  const { S, h, $ } = ctx;
  const rows = list.filter(h.inAttention);
  const get = (t: V2Task, k: string) =>
    ({
      title: t.title.toLowerCase(),
      owner: t.owner,
      deadline: h.dlKey(t),
      risk: RK[t.risk][2] - (h.isLate(t) ? 1 : 0),
      status: h.stateOf(t),
    })[k] ?? "";
  const data = sortBy(rows, S.tSort.key, S.tSort.dir, get);
  const shown = data.slice(0, 12);
  const cols: { k: string; t: string; s?: number }[] = [{ k: "title", t: "Công việc", s: 1 }];
  if (S.cols.owner) cols.push({ k: "owner", t: "Phụ trách", s: 1 });
  if (S.cols.deadline) cols.push({ k: "deadline", t: "Hạn", s: 1 });
  if (S.cols.risk) cols.push({ k: "risk", t: "Rủi ro", s: 1 });
  if (S.cols.status) cols.push({ k: "status", t: "Trạng thái", s: 1 }, { k: "p", t: "Tiến độ" });
  $("tHead").innerHTML = headRow(cols, S.tSort, "tsort");
  $("tBody").innerHTML = shown
    .map((t) => {
      const st = h.stateOf(t);
      return (
        `<tr class="row" data-task="${t.id}" tabindex="0"><td><div class="ttl">${esc(t.title)}<small>${esc(t.project)} · ${t.id}</small></div></td>` +
        (S.cols.owner ? `<td><div class="who">${avatar(t.owner)}${esc(t.owner)}</div></td>` : "") +
        (S.cols.deadline ? `<td class="${h.isLate(t) ? "dl-late" : ""}">${h.isLate(t) ? h.daysLate(t) + "d trễ" : h.fmtD(t.deadline)}</td>` : "") +
        (S.cols.risk ? `<td>${pill(RK[t.risk][1], RK[t.risk][0])}</td>` : "") +
        (S.cols.status ? `<td>${pill(ST[st][1], ST[st][0])}</td><td>${bar(t.progress)}</td>` : "") +
        `</tr>`
      );
    })
    .join("");
  $("tEmpty").hidden = data.length > 0;
  $("tInfo").textContent = data.length ? `Hiển thị ${shown.length}/${data.length} việc cần chú ý` : "";
}

function renderHealth(ctx: V2Ctx, list: V2Task[]) {
  const n = list.length || 1;
  const c = ctx.h.countStates(list);
  const onTrack = c.done + c.working + c.todo;
  const score = list.length ? Math.round(((onTrack + c.overdue * 0.4) / n) * 100) : 0;
  const vals = list.length ? [onTrack, c.overdue, c.blocked].map((v) => Math.round((v / n) * 100)) : [0, 0, 0];
  ctx.$("ringFill").style.strokeDashoffset = String(314 * (1 - score / 100));
  countUp(ctx.$("score"), score);
  const rows = [
    ["On Track", "var(--ok)"],
    ["At Risk", "var(--warn)"],
    ["Blocked", "var(--block)"],
  ];
  ctx.$("hstats").innerHTML = rows
    .map(
      (r, i) =>
        `<div class="hs" style="--c:${r[1]}"><div class="l"><span><i style="background:${r[1]}"></i>${r[0]}</span><b>${vals[i]}%</b></div><div class="bar"><span style="width:${vals[i]}%"></span></div></div>`,
    )
    .join("");
}

export interface ProjStat {
  name: string;
  deadline: string;
  progress: number;
  tasks: number;
  done: number;
  health: Health;
  group: string;
}

/** Project rows computed from the same task list as the KPI cards. */
export function projStats(ctx: V2Ctx, tasks: readonly V2Task[]): ProjStat[] {
  return ctx.h.projectStats(ctx.PROJECTS, tasks).map((p) => ({ ...p, health: HMAP[p.health] }));
}

export function renderProjects(ctx: V2Ctx) {
  const { S, h, $ } = ctx;
  const get = (p: ProjStat, k: string) =>
    ({ name: p.name, progress: p.progress, deadline: p.deadline || "9999-12-31", tasks: p.tasks, health: p.health[2] })[k] ?? "";
  const all = sortBy(projStats(ctx, ctx.filtered()), S.pSort.key, S.pSort.dir, get);
  const pages = Math.max(1, Math.ceil(all.length / S.pSize));
  S.pPage = Math.min(S.pPage, pages);
  const start = (S.pPage - 1) * S.pSize;
  const data = all.slice(start, start + S.pSize);
  $("pHead").innerHTML = headRow(
    [
      { k: "name", t: "Dự án", s: 1 },
      { k: "progress", t: "Tiến độ", s: 1 },
      { k: "deadline", t: "Deadline", s: 1 },
      { k: "tasks", t: "Tasks", s: 1 },
      { k: "health", t: "Tình trạng", s: 1 },
    ],
    S.pSort,
    "psort",
  );
  $("pBody").innerHTML =
    data
      .map(
        (p) =>
          `<tr class="row" data-proj="${esc(p.name)}"><td><div class="ttl">${esc(p.name)}</div></td><td>${bar(p.progress)}</td><td>${h.fmtD(p.deadline).replace("/", "-")}</td><td><b>${p.done}</b>/${p.tasks}</td><td>${pill(p.health[1], p.health[0])}</td></tr>`,
      )
      .join("") || `<tr><td colspan="5"><div class="empty">Không có dự án phù hợp.</div></td></tr>`;
  $("pInfo").textContent = all.length ? `${start + 1}–${start + data.length} trên ${all.length} dự án` : "0 dự án";
  let html = `<button data-pg="prev" ${S.pPage <= 1 ? "disabled" : ""} aria-label="Trang trước">‹</button>`;
  for (let i = 1; i <= pages; i++) html += `<button data-pg="${i}" class="${i === S.pPage ? "on" : ""}">${i}</button>`;
  html += `<button data-pg="next" ${S.pPage >= pages ? "disabled" : ""} aria-label="Trang sau">›</button>`;
  $("pPager").innerHTML = pages > 1 ? html : "";
  $("pFoot").style.display = pages > 1 ? "" : "none";
  ctx.after();
}

function decisionActionCell(r: V2DecisionRow): string {
  if (r.kind === "unassigned") {
    return r.unblockerName === "Chưa giao"
      ? pill("p-work", "Assign")
      : pill("p-bad", "Escalate");
  }
  if (r.canResolve) {
    return `<button class="chip-btn bk-act-btn pri" type="button" data-bact="resolve" data-bid="${esc(r.id)}">Gỡ xong</button>`;
  }
  if (r.canCancel) {
    return `<button class="chip-btn bk-act-btn" type="button" data-bact="cancel" data-bid="${esc(r.id)}">Huỷ</button>`;
  }
  return pill("p-mute", "Đang chờ");
}

export function renderBlockers(ctx: V2Ctx, filteredList?: readonly V2Task[]) {
  const { S, $, h } = ctx;
  const tasks = filteredList ?? ctx.filtered();
  const allRows = buildDecisionRows({
    requests: ctx.DECISIONS,
    tasks,
    allTasks: ctx.TASKS,
    members: ctx.MEMBERS,
    currentUserId: ctx.profile.userId ?? "",
    canEdit: ctx.canEdit,
    now: ctx.now,
  });

  const counts = tabCounts(allRows);
  const activeTab: V2DecisionTab = S.bTab ?? defaultDecisionTab(allRows);
  const tabRows = filterRowsByTab(allRows, activeTab);

  const tabsEl = $("blkTabs");
  if (tabsEl) {
    const tabs: [V2DecisionTab, string, number][] = [
      ["waiting", "Chờ tôi xử lý", counts.waiting],
      ["mine", "Vướng của tôi", counts.mine],
      ["team", "Toàn team", counts.team],
    ];
    tabsEl.innerHTML = tabs
      .map(
        ([k, label, cnt]) =>
          `<button class="blk-tab ${activeTab === k ? "on" : ""}" type="button" role="tab" aria-selected="${activeTab === k}" data-btab="${k}">${label} <b>${cnt}</b></button>`,
      )
      .join("");
  }

  const get = (r: V2DecisionRow, k: string) =>
    ({
      issue: r.taskTitle.toLowerCase(),
      unblocker: r.unblockerName.toLowerCase(),
      wait: r.wait.hours,
      action: r.kind === "request" ? (r.canResolve ? "0" : "1") : "2",
    })[k] ?? "";
  const data = sortBy(tabRows, S.bSort.key, S.bSort.dir, get);

  $("blkCount").textContent = allRows.length + " đang mở";
  $("bHead").innerHTML = headRow(
    [
      { k: "x", t: "" },
      { k: "issue", t: "Công việc", s: 1 },
      { k: "unblocker", t: "Người phụ trách", s: 1 },
      { k: "wait", t: "Đã chờ", s: 1 },
      { k: "action", t: "Hành động", s: 1 },
    ],
    S.bSort,
    "bsort",
  );

  $("bBody").innerHTML = data
    .map((r) => {
      const o = S.openBk.has(r.id) ? "open" : "";
      const dueStr = r.neededBy ? ` · Cần trước ${h.fmtD(r.neededBy)}` : "";
      const orphanTag = r.orphaned ? " · Không còn trên Planner" : "";
      const detailActions =
        r.kind === "request"
          ? `<div class="bk-detail-actions">` +
            (r.canResolve
              ? `<button class="chip-btn bk-act-btn pri" type="button" data-bact="resolve" data-bid="${esc(r.id)}">✓ Gỡ xong / Quyết định</button>`
              : "") +
            (r.canCancel
              ? `<button class="chip-btn bk-act-btn" type="button" data-bact="cancel" data-bid="${esc(r.id)}">Huỷ yêu cầu</button>`
              : "") +
            `</div>`
          : "";
      return (
        `<tr class="bk-main row ${o}" data-bk="${esc(r.id)}">` +
        `<td style="width:26px"><span class="chev">›</span></td>` +
        `<td><div class="ttl" style="min-width:130px">${esc(r.taskTitle)}<small>${esc(r.typeLabel)} · ${esc(r.project)}${esc(dueStr)}</small></div></td>` +
        `<td><div class="who">${avatar(r.unblockerName)}<span>${esc(r.unblockerName)}</span></div></td>` +
        `<td>${pill(WAIT_PILL[r.wait.tone], esc(r.wait.label))}</td>` +
        `<td>${decisionActionCell(r)}</td>` +
        `</tr>` +
        `<tr class="bk-detail ${o}"><td colspan="5"><div class="in"><div class="box">` +
        `<b>Người báo:</b> ${esc(r.raisedByName)} · <b>Loại:</b> ${esc(r.typeLabel)}<br>` +
        `<b>Nội dung vướng / cần quyết:</b> ${esc(r.need)}<br>` +
        `<b>Công việc ảnh hưởng:</b> ${esc(r.taskTitle)} (${esc(r.taskCode)})${esc(orphanTag)}` +
        detailActions +
        `</div></div></td></tr>`
      );
    })
    .join("");
  $("bEmpty").hidden = data.length > 0;
  ctx.after();
}

export function renderOverview(ctx: V2Ctx, list: V2Task[]) {
  renderKpis(ctx, list);
  renderTasks(ctx, list);
  renderHealth(ctx, list);
  renderProjects(ctx);
  renderBlockers(ctx, list);
}

/* ------------------------------- Modal -------------------------------- */

function setModalPct(ctx: V2Ctx, v: number) {
  ctx.$("mPct").textContent = v + "%";
  ctx.$("mBar").style.width = v + "%";
}

export function openModal(ctx: V2Ctx, id: string) {
  const { $, h, S } = ctx;
  const t = ctx.TASKS.find((x) => x.id === id);
  if (!t) return;
  S.modalId = id;
  const st = h.stateOf(t);
  $("mId").textContent = t.id;
  $("mTitle").textContent = t.title;
  $("mGrid").innerHTML = [
    ["Phụ trách", `${avatar(t.owner)}${esc(t.owner)}`],
    ["Dự án", esc(t.project)],
    ["Team", esc(t.team)],
    ["Hạn", `<span class="${h.isLate(t) ? "dl-late" : ""}">${h.fmtFull(t.deadline)}</span>`],
    ["Rủi ro", pill(RK[t.risk][1], RK[t.risk][0])],
    ["Trạng thái", pill(ST[st][1], ST[st][0])],
  ]
    .map((r) => `<div class="dc"><small>${r[0]}</small><div>${r[1]}</div></div>`)
    .join("");
  $("mRange").value = t.progress;
  $("mRange").disabled = !ctx.canEdit;
  $("mSave").hidden = !ctx.canEdit;
  const mRaiseBtn = $("mRaiseBtn");
  if (mRaiseBtn) {
    const hasOpenReq = ctx.DECISIONS.some((d) => d.status === "open" && d.plannerTaskId === t.pid);
    mRaiseBtn.hidden = !ctx.canRaise || t.status === "done" || hasOpenReq;
  }
  setModalPct(ctx, t.progress);
  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden", "false");
  $("mClose").focus();
}

function closeModal(ctx: V2Ctx) {
  ctx.$("modal").classList.remove("open");
  ctx.$("modal").setAttribute("aria-hidden", "true");
  ctx.S.modalId = null;
}

/** Replace a task immutably with its saved Planner state. */
export function applySaved(ctx: V2Ctx, id: string, status: V2Status, progress: number) {
  ctx.TASKS = ctx.TASKS.map((t) => (t.id === id ? { ...t, status, progress } : t));
}

async function saveModal(ctx: V2Ctx) {
  const { S, $ } = ctx;
  const t = ctx.TASKS.find((x) => x.id === S.modalId);
  if (!t || !ctx.canEdit || S.saving) return;
  const progress = Number($("mRange").value);
  let status: V2Status = t.status;
  if (progress === 100) status = "done";
  else if (t.status === "done" || (t.status === "todo" && progress > 0)) status = "working";
  if (progress === t.progress && status === t.status) {
    closeModal(ctx);
    ctx.toast("Không có thay đổi nào để lưu.", "info");
    return;
  }
  S.saving = true;
  $("mSave").disabled = true;
  $("mSave").textContent = "Đang lưu…";
  const res = await ctx.hooks.saveTask(t.pid, { status, progress });
  if (!ctx.alive()) return;
  S.saving = false;
  $("mSave").disabled = false;
  $("mSave").textContent = "Lưu tiến độ";
  if (!res.ok) {
    ctx.toast(res.message, "error");
    return;
  }
  applySaved(ctx, t.id, res.status, res.progress);
  closeModal(ctx);
  ctx.render.all();
  ctx.toast("Đã lưu tiến độ lên Microsoft Planner!", "success");
}

/* --------------------- Raise & Resolve Blocker Modals --------------------- */

export function openRaiseModal(ctx: V2Ctx, preselectedPid?: string) {
  const { $ } = ctx;
  if (!ctx.canRaise) {
    ctx.toast("Người xem (Viewer) không có quyền báo vướng.", "warning");
    return;
  }
  const openTaskPids = new Set(
    ctx.DECISIONS.filter((d) => d.status === "open").map((d) => d.plannerTaskId),
  );
  const candidateTasks = ctx.TASKS.filter(
    (t) => t.status !== "done" && (!openTaskPids.has(t.pid) || t.pid === preselectedPid),
  );

  $("rbTask").innerHTML = candidateTasks.length
    ? candidateTasks
        .map(
          (t) =>
            `<option value="${esc(t.pid)}" ${t.pid === preselectedPid ? "selected" : ""}>${esc(t.id)} · ${esc(t.title)} (${esc(t.project)})</option>`,
        )
        .join("")
    : `<option value="">— Chưa có công việc khả dụng —</option>`;

  const candidates = sortUnblockerCandidates(ctx.MEMBERS);
  const fallbackId = ctx.profile.userId || "00000000-0000-0000-0000-00000000000a";
  $("rbUnblocker").innerHTML = candidates.length
    ? candidates
        .map(
          (m) =>
            `<option value="${esc(m.id)}">${esc(m.name)} (${esc(m.roleLabel)})</option>`,
        )
        .join("")
    : `<option value="${esc(fallbackId)}">${esc(ctx.profile.name)} (${esc(ctx.profile.roleLabel)})</option>`;

  $("rbType").value = "decision";
  $("rbNeededBy").value = "";
  $("rbNeed").value = "";
  const modalEl = $("raiseModal");
  if (modalEl) {
    modalEl.classList.add("open");
    modalEl.setAttribute("aria-hidden", "false");
    $("rbNeed")?.focus();
  }
}

function closeRaiseModal(ctx: V2Ctx) {
  const modalEl = ctx.$("raiseModal");
  if (!modalEl) return;
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
}

async function submitRaiseModal(ctx: V2Ctx) {
  const { $, S } = ctx;
  if (!ctx.hooks.raiseBlocker || S.saving) return;
  const plannerTaskId = String($("rbTask")?.value ?? "").trim();
  const type = String($("rbType")?.value ?? "decision") as DecisionType;
  const unblockerId = String($("rbUnblocker")?.value ?? "").trim();
  const neededBy = String($("rbNeededBy")?.value ?? "").trim() || null;
  const need = String($("rbNeed")?.value ?? "").trim();

  const task = ctx.TASKS.find((t) => t.pid === plannerTaskId);
  if (!task || !need || !unblockerId) {
    ctx.toast("Vui lòng chọn công việc, người gỡ và nhập nội dung vướng mắc.", "warning");
    return;
  }

  S.saving = true;
  $("rbSubmit").disabled = true;
  $("rbSubmit").textContent = "Đang gửi…";
  const res = await ctx.hooks.raiseBlocker({
    plannerTaskId,
    taskTitle: task.title,
    projectName: task.project,
    type,
    need,
    unblockerId,
    neededBy,
  });
  if (!ctx.alive()) return;
  S.saving = false;
  $("rbSubmit").disabled = false;
  $("rbSubmit").textContent = "Gửi yêu cầu";

  if (!res.ok) {
    ctx.toast(res.message, "error");
    return;
  }

  ctx.DECISIONS = [res.request, ...ctx.DECISIONS.filter((d) => d.id !== res.request.id)];
  const nextPct = task.progress === 100 ? 50 : task.progress;
  applySaved(ctx, task.id, "blocked", nextPct);
  closeRaiseModal(ctx);
  closeModal(ctx);
  ctx.render.all();
  ctx.toast("Đã gửi yêu cầu gỡ vướng!", "success");
}

function openResolveModal(ctx: V2Ctx, decisionId: string) {
  const { $, S } = ctx;
  const req = ctx.DECISIONS.find((d) => d.id === decisionId && d.status === "open");
  if (!req) return;
  S.resolvingId = decisionId;
  $("rsSummary").innerHTML =
    `<b>${esc(req.taskTitle)}</b><br><small style="color:var(--text-2)">Vướng mắc: ${esc(req.need)}</small>`;
  $("rsResolution").value = "";
  $("rsResolution").required = req.type === "decision";
  $("rsLabel").textContent =
    req.type === "decision"
      ? "Quyết định đưa ra (bắt buộc để khép vòng)"
      : "Cách đã gỡ vướng (tuỳ chọn)";
  const modalEl = $("resolveModal");
  if (modalEl) {
    modalEl.classList.add("open");
    modalEl.setAttribute("aria-hidden", "false");
    $("rsResolution")?.focus();
  }
}

function closeResolveModal(ctx: V2Ctx) {
  const modalEl = ctx.$("resolveModal");
  if (!modalEl) return;
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
  ctx.S.resolvingId = null;
}

async function submitResolveModal(ctx: V2Ctx) {
  const { $, S } = ctx;
  const id = S.resolvingId;
  if (!id || !ctx.hooks.resolveDecision || S.saving) return;
  const req = ctx.DECISIONS.find((d) => d.id === id);
  const resolution = String($("rsResolution")?.value ?? "").trim();
  if (req?.type === "decision" && !resolution) {
    ctx.toast("Vui lòng ghi rõ quyết định để khép vòng với người báo.", "warning");
    return;
  }

  S.saving = true;
  $("rsSubmit").disabled = true;
  $("rsSubmit").textContent = "Đang xử lý…";
  const res = await ctx.hooks.resolveDecision(id, { action: "resolve", resolution });
  if (!ctx.alive()) return;
  S.saving = false;
  $("rsSubmit").disabled = false;
  $("rsSubmit").textContent = "Xác nhận đã gỡ";

  if (!res.ok) {
    ctx.toast(res.message, "error");
    return;
  }

  ctx.DECISIONS = ctx.DECISIONS.filter((d) => d.id !== id);
  const task = ctx.TASKS.find((t) => t.pid === res.request.plannerTaskId);
  if (task && task.status === "blocked") {
    applySaved(ctx, task.id, task.progress === 0 ? "todo" : "working", task.progress);
  }
  closeResolveModal(ctx);
  ctx.render.all();
  ctx.toast("Đã gỡ vướng và thông báo khép vòng!", "success");
}

async function cancelDecision(ctx: V2Ctx, decisionId: string) {
  const { S } = ctx;
  if (!ctx.hooks.resolveDecision || S.saving) return;
  S.saving = true;
  const res = await ctx.hooks.resolveDecision(decisionId, { action: "cancel", resolution: "" });
  if (!ctx.alive()) return;
  S.saving = false;
  if (!res.ok) {
    ctx.toast(res.message, "error");
    return;
  }
  ctx.DECISIONS = ctx.DECISIONS.filter((d) => d.id !== decisionId);
  const task = ctx.TASKS.find((t) => t.pid === res.request.plannerTaskId);
  if (task && task.status === "blocked") {
    applySaved(ctx, task.id, task.progress === 0 ? "todo" : "working", task.progress);
  }
  ctx.render.all();
  ctx.toast("Đã huỷ yêu cầu gỡ vướng.", "info");
}

/* ------------------------------- Events ------------------------------- */

export function showView(ctx: V2Ctx, view: V2View) {
  const { $, S } = ctx;
  S.view = view;
  renderNav(ctx);
  ["v-overview", "v-tasks", "v-other"].forEach((id) => $(id).classList.remove("on"));
  const known = KNOWN_VIEWS[view];
  if (known) $(known).classList.add("on");
  else {
    $("v-other").classList.add("on");
    const n = NAV.find((x) => x.k === view);
    $("oTitle").textContent = n?.t ?? "";
    $("oIcon").innerHTML = n ? svg(n.i) : "";
  }
  if (view === "tasks") ctx.render.tasksPage();
}

export function installOverview(ctx: V2Ctx) {
  const { $, S, on } = ctx;
  renderHeads(ctx);
  const app = $("app");
  const side = $("side");
  const closeSide = () => {
    side.classList.remove("open");
    $("scrim").classList.remove("on");
  };
  let qTimer: ReturnType<typeof setTimeout> | undefined;
  on($("q"), "input", (e: Event) => {
    clearTimeout(qTimer);
    const value = (e.target as HTMLInputElement).value;
    qTimer = setTimeout(() => {
      if (!ctx.alive()) return;
      S.q = value;
      ctx.render.all();
    }, 120);
  });
  on($("fPeriod"), "change", (e: Event) => {
    S.period = (e.target as HTMLSelectElement).value;
    ctx.render.all();
  });
  on($("fTeam"), "change", (e: Event) => {
    S.team = (e.target as HTMLSelectElement).value;
    S.pPage = 1;
    ctx.render.all();
  });
  on($("fProj"), "change", (e: Event) => {
    S.project = (e.target as HTMLSelectElement).value;
    S.pPage = 1;
    ctx.render.all();
  });
  on($("nav"), "click", (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-nav]");
    if (!b) return;
    const view = b.dataset.nav as V2View;
    showView(ctx, view);
    ctx.hooks.navigate(view);
    closeSide();
  });
  on($("goTasks"), "click", () => {
    showView(ctx, "tasks");
    ctx.hooks.navigate("tasks");
  });

  if ($("btnRaiseBlocker")) {
    on($("btnRaiseBlocker"), "click", () => openRaiseModal(ctx));
  }
  if ($("mRaiseBtn")) {
    on($("mRaiseBtn"), "click", () => {
      const t = ctx.TASKS.find((x) => x.id === S.modalId);
      closeModal(ctx);
      openRaiseModal(ctx, t?.pid);
    });
  }
  if ($("rbClose")) on($("rbClose"), "click", () => closeRaiseModal(ctx));
  if ($("rbCancel")) on($("rbCancel"), "click", () => closeRaiseModal(ctx));
  if ($("raiseModal")) {
    on($("raiseModal"), "click", (e: Event) => {
      if (e.target === $("raiseModal")) closeRaiseModal(ctx);
    });
  }
  if ($("rbForm")) {
    on($("rbForm"), "submit", (e: Event) => {
      e.preventDefault();
      void submitRaiseModal(ctx);
    });
  }

  if ($("rsClose")) on($("rsClose"), "click", () => closeResolveModal(ctx));
  if ($("rsCancel")) on($("rsCancel"), "click", () => closeResolveModal(ctx));
  if ($("resolveModal")) {
    on($("resolveModal"), "click", (e: Event) => {
      if (e.target === $("resolveModal")) closeResolveModal(ctx);
    });
  }
  if ($("rsForm")) {
    on($("rsForm"), "submit", (e: Event) => {
      e.preventDefault();
      void submitResolveModal(ctx);
    });
  }

  on(document, "click", (e: Event) => {
    const target = e.target as HTMLElement;
    const btab = target.closest<HTMLElement>("[data-btab]");
    if (btab && ctx.root.contains(btab)) {
      S.bTab = btab.dataset.btab as V2DecisionTab;
      ctx.render.blockers();
      return;
    }
    const bact = target.closest<HTMLElement>("[data-bact]");
    if (bact && ctx.root.contains(bact)) {
      e.stopPropagation();
      const bid = bact.dataset.bid ?? "";
      if (bact.dataset.bact === "resolve") openResolveModal(ctx, bid);
      else if (bact.dataset.bact === "cancel") void cancelDecision(ctx, bid);
      return;
    }
    const th = target.closest<HTMLElement>("th[data-tsort],th[data-psort],th[data-bsort]");
    if (th) {
      const [state, key] = th.dataset.tsort
        ? [S.tSort, th.dataset.tsort]
        : th.dataset.psort
          ? [S.pSort, th.dataset.psort]
          : [S.bSort, th.dataset.bsort ?? ""];
      state.dir = state.key === key ? -state.dir : 1;
      state.key = key;
      ctx.render.all();
      return;
    }
    const tr = target.closest<HTMLElement>("[data-task]");
    if (tr && ctx.root.contains(tr)) {
      openModal(ctx, tr.dataset.task ?? "");
      return;
    }
    const bk = target.closest<HTMLElement>("[data-bk]");
    if (bk) {
      const id = bk.dataset.bk ?? "";
      if (S.openBk.has(id)) S.openBk.delete(id);
      else S.openBk.add(id);
      ctx.render.blockers();
      return;
    }
    const pg = target.closest<HTMLElement>("[data-pg]");
    if (pg) {
      const v = pg.dataset.pg;
      S.pPage = v === "prev" ? S.pPage - 1 : v === "next" ? S.pPage + 1 : Number(v);
      ctx.render.projects();
      return;
    }
    const pr = target.closest<HTMLElement>("[data-proj]");
    if (pr) {
      $("fProj").value = pr.dataset.proj;
      S.project = pr.dataset.proj ?? "all";
      S.pPage = 1;
      ctx.render.all();
      return;
    }
    if (!target.closest("#picker,#colBtn")) $("picker").hidden = true;
    if (!target.closest("#bellBtn,#bellPop")) $("bellPop").classList.remove("open");
    if (!target.closest("#profBtn,#profMenu")) {
      $("profMenu").classList.remove("open");
      $("profBtn").setAttribute("aria-expanded", "false");
    }
  });
  on(document, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal(ctx);
      closeRaiseModal(ctx);
      closeResolveModal(ctx);
      $("picker").hidden = true;
      $("bellPop").classList.remove("open");
      $("profMenu").classList.remove("open");
      closeSide();
    }
    const el = e.target as HTMLElement;
    if (e.key === "Enter" && el.matches?.("[data-task]")) openModal(ctx, el.dataset.task ?? "");
  });
  on($("pSize"), "change", (e: Event) => {
    S.pSize = Number((e.target as HTMLSelectElement).value);
    S.pPage = 1;
    ctx.render.projects();
  });

  on($("colBtn"), "click", () => {
    $("picker").hidden = !$("picker").hidden;
  });
  $("picker").innerHTML = [
    ["owner", "Phụ trách"],
    ["deadline", "Hạn"],
    ["risk", "Rủi ro"],
    ["status", "Trạng thái &amp; tiến độ"],
  ]
    .map((c) => `<label><input type="checkbox" data-col="${c[0]}" checked>${c[1]}</label>`)
    .join("");
  on($("picker"), "change", (e: Event) => {
    const input = e.target as HTMLInputElement;
    S.cols[input.dataset.col as keyof typeof S.cols] = input.checked;
    renderTasks(ctx, ctx.filtered());
    ctx.after();
  });

  on($("bellBtn"), "click", () => $("bellPop").classList.toggle("open"));
  on($("profBtn"), "click", () => {
    const o = $("profMenu").classList.toggle("open");
    $("profBtn").setAttribute("aria-expanded", String(o));
  });
  on($("profMenu"), "click", (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-prof]");
    if (!b) return;
    $("profMenu").classList.remove("open");
    if (b.dataset.prof === "logout") void ctx.hooks.signOut();
    else {
      showView(ctx, "settings");
      ctx.hooks.navigate("settings");
    }
  });

  on($("mClose"), "click", () => closeModal(ctx));
  on($("mCancel"), "click", () => closeModal(ctx));
  on($("modal"), "click", (e: Event) => {
    if (e.target === $("modal")) closeModal(ctx);
  });
  on($("mRange"), "input", (e: Event) => setModalPct(ctx, Number((e.target as HTMLInputElement).value)));
  on($("mSave"), "click", () => void saveModal(ctx));

  on($("collapseBtn"), "click", () => {
    app.classList.toggle("collapsed");
    $("collapseBtn").style.transform = app.classList.contains("collapsed") ? "rotate(180deg)" : "";
  });
  on($("menuBtn"), "click", () => {
    side.classList.add("open");
    $("scrim").classList.add("on");
  });
  on($("scrim"), "click", closeSide);
  on($("resetBtn"), "click", () => {
    S.q = "";
    S.period = S.team = S.project = "all";
    S.pPage = 1;
    $("q").value = "";
    $("fPeriod").value = $("fTeam").value = $("fProj").value = "all";
    ctx.render.all();
    ctx.toast("Đã đặt lại bộ lọc");
  });
  /* Vệt sáng bóng loáng chạy theo con trỏ trên viền và bề mặt */
  on(
    document,
    "pointermove",
    (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.<HTMLElement>(".kpi,.panel,.profile,.sel,.search,.icon-btn");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    },
    { passive: true },
  );
}
