// components/v2/v2-tasks.ts
// "Dự án & Công việc" page of the V2 template — port of Dashboard Sunext
// V2/index.html lines 2244–2841 (view state, saved views, project strip,
// collapsible sections, Kanban drag & drop). Kanban drops are written to
// Microsoft Planner; Planner has no "Bị chặn" state, so that column is
// view-only.

import type { V2Status } from "@/lib/v2/v2-model";
import type { V2Ctx } from "./v2-context";
import { ST, avatar, esc, pill, STO } from "./v2-core";
import { applySaved, projStats } from "./v2-overview";
import { ALL_PROJECTS_THEME, themeFor, type V2ProjectTheme } from "./v2-project-themes";
import {
  groupList,
  taskColumns,
  tvCards,
  tvGantt,
  tvKanban,
  tvListView,
  tvTable,
  type V2Group,
  type V2TvState,
  type V2ViewEnv,
} from "./v2-task-views";

const TV_KEY = "sunext-tasks-view-v2";
const SV_KEY = "sunext-saved-views";
const SEC_COLLAPSE_KEY = "sunext-sec-collapse-v1";

const TV_DEF: V2TvState = {
  view: "list",
  group: "owner",
  sortKey: "deadline",
  dir: 1,
  density: "cozy",
  status: [],
  active: "Theo thành viên",
  cols: { id: true, title: true, project: true, team: false, owner: true, deadline: true, risk: true, status: true, progress: true },
};
const PRESETS: { name: string; cfg: Partial<V2TvState> }[] = [
  { name: "Theo thành viên", cfg: { view: "list", group: "owner", sortKey: "deadline", dir: 1, status: [] } },
  { name: "Tất cả công việc", cfg: { view: "table", group: "none", sortKey: "deadline", dir: 1, status: [] } },
  { name: "Cần xử lý gấp", cfg: { view: "table", group: "project", sortKey: "risk", dir: 1, status: ["overdue", "blocked"] } },
  { name: "Gantt tiến độ", cfg: { view: "gantt", group: "project", sortKey: "deadline", dir: 1, status: [] } },
  { name: "Bảng Kanban", cfg: { view: "kanban", group: "none", sortKey: "deadline", dir: 1, status: [] } },
  { name: "Tải việc theo người", cfg: { view: "list", group: "owner", sortKey: "deadline", dir: 1, status: ["working", "overdue", "blocked"] } },
];
const VIEW_NAMES: Record<string, string> = { table: "Bảng", kanban: "Kanban", list: "Danh sách", gantt: "Gantt", cards: "Thẻ" };

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type SecKey = "kpis" | "pj" | "filters" | "toolbar";

export function installTasks(ctx: V2Ctx) {
  const { $, S, h, on } = ctx;
  let TV: V2TvState = clone(TV_DEF);
  let SAVED: { name: string; cfg: Partial<V2TvState> }[] = [];
  const collapsed = new Set<string>();
  const stored = readJson<Partial<V2TvState> | null>(TV_KEY, null);
  if (stored) TV = { ...clone(TV_DEF), ...stored, cols: { ...TV_DEF.cols, ...(stored.cols ?? {}) } };
  SAVED = readJson(SV_KEY, [] as typeof SAVED) || [];
  const persistTV = () => {
    try {
      localStorage.setItem(TV_KEY, JSON.stringify(TV));
      localStorage.setItem(SV_KEY, JSON.stringify(SAVED));
    } catch {
      /* storage unavailable (private mode) — view state stays in memory */
    }
  };
  const SEC: Record<SecKey, boolean> = { kpis: false, pj: false, filters: false, toolbar: false };
  const savedSec = readJson<Partial<Record<SecKey, unknown>> | null>(SEC_COLLAPSE_KEY, null);
  if (savedSec && typeof savedSec === "object")
    (Object.keys(SEC) as SecKey[]).forEach((k) => {
      if (typeof savedSec[k] === "boolean") SEC[k] = savedSec[k] as boolean;
    });

  const cols = taskColumns(h);
  $("tvSort").innerHTML = cols.map((c) => `<option value="${c.k}">${c.t}</option>`).join("");
  const env = (): V2ViewEnv => ({ h, TV, collapsed, canEdit: ctx.canEdit });

  function tvItems(all: ReturnType<V2Ctx["filtered"]>) {
    const col = cols.find((c) => c.k === TV.sortKey) ?? cols[1];
    return all
      .filter((t) => !TV.status.length || TV.status.some((k) => (k === "soon" ? h.isSoon(t) : h.stateOf(t) === k)))
      .sort((a, b) => {
        const x = col.s(a);
        const y = col.s(b);
        const c = x > y ? 1 : x < y ? -1 : 0;
        return c ? c * TV.dir : a.id.localeCompare(b.id);
      });
  }

  function renderProjStrip() {
    const ps = projStats(ctx, "all");
    const allTasks = ctx.TASKS.filter((t) => S.team === "all" || t.team === S.team);
    const avgAll = ps.length ? Math.round(ps.reduce((a, p) => a + p.progress, 0) / ps.length) : 0;
    const themeIndex = new Map(ctx.PROJECTS.map((p, i) => [p.name, i]));

    function renderCard(
      name: string,
      progress: number,
      done: number,
      total: number,
      dueHtml: string,
      health: readonly [string, string, number] | null,
      isAll: boolean,
      sub: string,
    ) {
      const isSelected = isAll ? S.project === "all" : S.project === name;
      const theme: V2ProjectTheme = isAll ? ALL_PROJECTS_THEME : themeFor(themeIndex.get(name) ?? 0);
      const pTasks = isAll ? allTasks : allTasks.filter((t) => t.project === name);
      const nWorking = pTasks.filter((t) => t.status === "working").length;
      const nAtt = pTasks.filter(h.needsAtt).length;
      const nTodo = pTasks.filter((t) => t.status === "todo").length;
      const owners = [...new Set(pTasks.map((t) => t.owner))];
      const avsHtml = owners.length
        ? `<div class="avs" title="Thành viên phụ trách: ${esc(owners.join(", "))}">` +
          owners.slice(0, 3).map((o) => avatar(o)).join("") +
          (owners.length > 3 ? `<span class="ava more">+${owners.length - 3}</span>` : "") +
          `</div>`
        : "";
      const healthBadge = isAll || !health ? `<span class="pill p-work">${ps.length} dự án</span>` : pill(health[1], health[0]);
      return `
    <article class="pjc-card pjc ${isSelected ? "selected" : ""}" data-pj="${esc(name)}" role="button" tabindex="0" aria-pressed="${isSelected ? "true" : "false"}" aria-label="Dự án ${esc(name)}: tiến độ ${progress}%, ${done} trên ${total} việc hoàn thành" style="--c:${theme.c}; --c-light:${theme.cLight}; --c-bg:${theme.cBg};">
      <div class="pjc-top-row">
        <div class="pjc-icon-wrap" style="color:${theme.c}; background:${theme.cBg}">${theme.icon}</div>
        <div class="pjc-health">${healthBadge}</div>
      </div>
      <div class="pjc-title-box">
        <h3 class="pjc-name" title="${esc(name)}">${esc(name)}</h3>
        <span class="pjc-sub-tag">${esc(sub)}</span>
      </div>
      <div class="pjc-metric-row">
        <div class="pjc-pct-box"><span class="pjc-pct">${progress}%</span><span class="pjc-pct-sub">tiến độ</span></div>
        <div class="pjc-tasks-box"><div class="pjc-task-count"><b>${done}</b>/${total}</div><span class="pjc-task-sub">việc xong</span></div>
      </div>
      <div class="pjc-bar-track"><div class="pjc-bar-fill" style="width:${progress}%; background:linear-gradient(90deg, ${theme.c}, ${theme.cLight});"></div></div>
      <div class="pjc-chips-row">
        <span class="pjc-chip chip-done" title="Đã hoàn thành"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${done} xong</span>
        <span class="pjc-chip chip-work" title="Đang thực hiện"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg> ${nWorking} đang làm</span>
        ${
          nAtt > 0
            ? `<span class="pjc-chip chip-att" title="Cần chú ý (Trễ hạn / Bị chặn)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${nAtt} chú ý</span>`
            : nTodo > 0
              ? `<span class="pjc-chip chip-todo" title="Chưa làm">${nTodo} chưa làm</span>`
              : ""
        }
      </div>
      <div class="pjc-footer">
        <div class="pjc-due-info" title="Thời hạn dự án"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>${dueHtml}</span></div>
        <div class="pjc-team-wrap">${avsHtml}</div>
      </div>
    </article>`;
    }

    let html = renderCard(
      "Tất cả dự án",
      avgAll,
      ps.reduce((a, p) => a + p.done, 0),
      allTasks.length,
      "Tổng quan",
      null,
      true,
      `Toàn bộ ${ps.length} dự án`,
    );
    ps.forEach((p) => {
      html += renderCard(p.name, p.progress, p.done, p.tasks, h.pjDue(p.deadline), p.health, false, p.group || "Microsoft Planner");
    });
    $("pjStrip").innerHTML = html;
    $("pjSub").textContent = `${ps.length} dự án · ${allTasks.length} công việc · Bấm vào thẻ dự án để lọc công việc`;
    $("tvTitle").innerHTML = S.project === "all" ? "Công việc <b>của các thành viên</b>" : `Công việc · <b>${esc(S.project)}</b>`;
  }

  function renderTasksPage() {
    renderProjStrip();
    const all = ctx.filtered();
    const cnt = { working: 0, overdue: 0, blocked: 0, done: 0, todo: 0 };
    all.forEach((t) => cnt[h.stateOf(t)]++);
    const views = [...PRESETS.map((v) => ({ ...v, custom: false })), ...SAVED.map((v) => ({ ...v, custom: true }))];
    $("tvViews").innerHTML = views
      .map(
        (v) =>
          `<button class="vchip ${TV.active === v.name ? "on" : ""}" data-tvview="${esc(v.name)}">${esc(v.name)}${v.custom ? `<span class="x" data-tvdel="${esc(v.name)}" role="button" aria-label="Xoá view" title="Xoá view">×</span>` : ""}</button>`,
      )
      .join("");
    const defs: (readonly [string, string?, number?, string?])[] = [
      ["all", "Tất cả", all.length],
      ["overdue", "Trễ hạn", cnt.overdue, "a-bad"],
      ["blocked", "Bị chặn", cnt.blocked, "a-block"],
      ["soon", "Sắp đến hạn", all.filter(h.isSoon).length, "a-warn"],
      ["sep"],
      ["working", "Đang làm", cnt.working],
      ["todo", "Chưa làm", cnt.todo],
      ["done", "Đã xong", cnt.done],
    ];
    $("tvStatus").innerHTML = defs
      .map(([k, l, n, a]) =>
        k === "sep"
          ? '<i class="st-sep"></i>'
          : `<button class="schip ${a && n ? "att " + a : ""} ${(k === "all" ? !TV.status.length : TV.status.includes(k)) ? "on" : ""}" data-tvst="${k}">${l}<b>${n}</b></button>`,
      )
      .join("");
    [...$("tvType").children].forEach((b: HTMLElement) => b.classList.toggle("on", b.dataset.vt === TV.view));
    [...$("tvDen").children].forEach((b: HTMLElement) => b.classList.toggle("on", b.dataset.den === TV.density));
    $("tvGroup").value = TV.group;
    $("tvSort").value = TV.sortKey;
    $("tvDir").textContent = TV.dir > 0 ? "↑" : "↓";
    $("tvDir").title = TV.dir > 0 ? "Tăng dần" : "Giảm dần";
    $("tvViewName").textContent = TV.active || "Tuỳ chỉnh";
    $("tvColBtn").disabled = TV.view !== "table";
    $("tvColBtn").title = TV.view === "table" ? "" : "Chỉ áp dụng cho kiểu Bảng";
    $("tvPicker").innerHTML = cols
      .filter((c) => !c.fixed)
      .map((c) => `<label><input type="checkbox" data-tvcol="${c.k}" ${TV.cols[c.k] ? "checked" : ""}>${c.t}</label>`)
      .join("");

    const list = tvItems(all);
    const groups: V2Group[] = groupList(h, TV.group, list);
    $("tvSub").textContent = `${list.length}/${all.length} công việc${TV.group !== "none" && TV.view !== "kanban" ? ` · nhóm theo ${$("tvGroup").selectedOptions[0].textContent.toLowerCase()}` : ""}`;
    let html: string;
    if (!list.length && TV.view !== "kanban") html = '<div class="panel"><div class="empty">Không có công việc phù hợp với view này.</div></div>';
    else
      html =
        TV.view === "table"
          ? tvTable(env(), groups)
          : TV.view === "kanban"
            ? tvKanban(env(), list)
            : TV.view === "gantt"
              ? tvGantt(env(), list)
              : TV.view === "list"
                ? tvListView(env(), groups)
                : tvCards(env(), groups);
    const oldSc = $("tvBody").querySelector(".gt-scroll");
    const keepX = oldSc ? oldSc.scrollLeft : null;
    const keepY = oldSc ? oldSc.scrollTop : 0;
    $("tvBody").innerHTML = html;
    const sc = $("tvBody").querySelector(".gt-scroll");
    if (sc) {
      sc.scrollTop = keepY;
      sc.scrollLeft = keepX !== null ? keepX : Math.max(0, Number(sc.dataset.today) - 430);
    }
    updateSecCollapseUI();
    ctx.after();
  }

  /* ---------------- 3 COLLAPSIBLE SECTIONS (+ KPI on overview) ---------------- */
  function setBtn(btn: HTMLElement, isCol: boolean, openTxt: string, title: string) {
    btn.classList.toggle("is-collapsed", isCol);
    btn.setAttribute("aria-expanded", isCol ? "false" : "true");
    const txt = btn.querySelector(".sec-collapse-txt");
    if (txt) txt.textContent = isCol ? openTxt : "Thu gọn";
    btn.title = (isCol ? "Mở rộng " : "Thu gọn ") + title;
  }
  function updateSecCollapseUI() {
    $("wrapKpis").classList.toggle("is-collapsed", SEC.kpis);
    setBtn($("btnToggleKpis"), SEC.kpis, "Mở rộng", "Chỉ số công việc");
    $("wrapPj").classList.toggle("is-collapsed", SEC.pj);
    setBtn($("btnTogglePj"), SEC.pj, "Mở rộng", "Khối dự án");
    $("wrapFilters").classList.toggle("is-collapsed", SEC.filters);
    $("tvHead").classList.toggle("is-collapsed", SEC.filters);
    setBtn($("btnToggleFilters"), SEC.filters, "Mở bộ lọc", "Bộ lọc trạng thái");
    $("panelTvbar").classList.toggle("is-collapsed", SEC.toolbar);
    setBtn($("btnToggleToolbar"), SEC.toolbar, "Mở công cụ", "Thanh công cụ");
    $("tvbarMiniInfo").style.display = SEC.toolbar ? "inline-flex" : "none";
    if (SEC.toolbar) {
      const grp = $("tvGroup").selectedOptions[0];
      const sort = $("tvSort").selectedOptions[0];
      const grpText = TV.group !== "none" && grp ? ` · Nhóm: ${grp.textContent}` : "";
      const sortText = sort ? ` · Xếp: ${sort.textContent}` : "";
      $("tvbarMiniTag").innerHTML = `<b>${esc(VIEW_NAMES[TV.view] ?? TV.view)}</b>${esc(grpText)}${esc(sortText)}`;
    }
  }
  const secButtons: [string, SecKey][] = [
    ["btnToggleKpis", "kpis"],
    ["btnTogglePj", "pj"],
    ["btnToggleFilters", "filters"],
    ["btnToggleToolbar", "toolbar"],
  ];
  secButtons.forEach(([id, key]) =>
    on($(id), "click", (e: Event) => {
      e.stopPropagation();
      SEC[key] = !SEC[key];
      try {
        localStorage.setItem(SEC_COLLAPSE_KEY, JSON.stringify(SEC));
      } catch {
        /* storage unavailable — collapse state stays in memory */
      }
      updateSecCollapseUI();
    }),
  );

  /* ---------------- Status change (Kanban) → Microsoft Planner ---------------- */
  async function setStatus(id: string, key: string) {
    const t = ctx.TASKS.find((x) => x.id === id);
    if (!t || key === "overdue" || key === t.status) return;
    if (!ctx.canEdit) {
      ctx.toast("Chỉ Owner, Admin hoặc Manager được đổi trạng thái công việc.", "warning");
      return;
    }
    if (key === "blocked") {
      ctx.toast("Microsoft Planner không có trạng thái “Bị chặn” — chưa thể chuyển sang cột này.", "warning");
      return;
    }
    const status = key as V2Status;
    const progress = status === "done" ? 100 : status === "todo" ? 0 : t.progress === 100 || t.progress === 0 ? 50 : t.progress;
    const before = { status: t.status, progress: t.progress };
    applySaved(ctx, id, status, progress);
    ctx.render.all();
    const res = await ctx.hooks.saveTask(t.pid, { status, progress });
    if (!ctx.alive()) return;
    if (!res.ok) {
      applySaved(ctx, id, before.status, before.progress);
      ctx.render.all();
      ctx.toast(res.message, "error");
      return;
    }
    applySaved(ctx, id, res.status, res.progress);
    ctx.render.all();
    ctx.toast(`Đã chuyển sang “${ST[key as keyof typeof ST][0]}” trên Microsoft Planner`, "success");
  }

  const touch = () => {
    TV.active = "";
    persistTV();
    renderTasksPage();
  };
  function applyView(name: string) {
    const v = [...PRESETS, ...SAVED].find((x) => x.name === name);
    if (!v) return;
    TV = { ...TV, ...clone(v.cfg), cols: v.cfg.cols ? { ...TV_DEF.cols, ...v.cfg.cols } : TV.cols };
    TV.active = name;
    persistTV();
    renderTasksPage();
  }
  function selectProject(pName: string) {
    S.project = pName === "Tất cả dự án" ? "all" : S.project === pName ? "all" : pName;
    $("fProj").value = S.project;
    S.pPage = 1;
    ctx.render.all();
  }

  on($("pjStrip"), "click", (e: Event) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-pj]");
    if (card) selectProject(card.dataset.pj ?? "all");
  });
  on($("pjStrip"), "keydown", (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-pj]");
    if (card) {
      e.preventDefault();
      selectProject(card.dataset.pj ?? "all");
    }
  });
  const V = $("v-tasks");
  on(V, "click", (e: Event) => {
    const t = e.target as HTMLElement;
    let b: HTMLElement | null;
    if ((b = t.closest("[data-tvdel]"))) {
      e.stopPropagation();
      const n = b.dataset.tvdel;
      SAVED = SAVED.filter((v) => v.name !== n);
      if (TV.active === n) TV.active = "";
      persistTV();
      renderTasksPage();
      return;
    }
    if ((b = t.closest("[data-tvview]"))) return applyView(b.dataset.tvview ?? "");
    if ((b = t.closest("[data-vt]"))) {
      TV.view = b.dataset.vt as V2TvState["view"];
      return touch();
    }
    if ((b = t.closest("[data-den]"))) {
      TV.density = b.dataset.den as V2TvState["density"];
      return touch();
    }
    if ((b = t.closest("[data-tvst]"))) {
      const k = b.dataset.tvst ?? "all";
      TV.status = k === "all" ? [] : TV.status.includes(k) ? TV.status.filter((x) => x !== k) : [...TV.status, k];
      return touch();
    }
    if ((b = t.closest("[data-tvsort]"))) {
      const k = b.dataset.tvsort ?? "deadline";
      TV.dir = TV.sortKey === k ? -TV.dir : 1;
      TV.sortKey = k;
      return touch();
    }
    if ((b = t.closest("[data-grp]"))) {
      const k = b.dataset.grp ?? "";
      if (collapsed.has(k)) collapsed.delete(k);
      else collapsed.add(k);
      return renderTasksPage();
    }
    if (t.closest("#tvDir")) {
      TV.dir = -TV.dir;
      return touch();
    }
    if (t.closest("#tvColBtn")) {
      $("tvPicker").hidden = !$("tvPicker").hidden;
      return;
    }
    if (t.closest("#tvReset")) {
      TV = clone(TV_DEF);
      persistTV();
      return renderTasksPage();
    }
    if (t.closest("#tvSaveBtn")) {
      $("tvSaveForm").hidden = false;
      $("tvSaveBtn").hidden = true;
      $("tvName").value = "";
      $("tvName").focus();
      return;
    }
    if (t.closest("#tvSaveCancel")) {
      $("tvSaveForm").hidden = true;
      $("tvSaveBtn").hidden = false;
    }
  });
  on(V, "change", (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "tvGroup") {
      TV.group = t.value as V2TvState["group"];
      collapsed.clear();
      touch();
    } else if (t.id === "tvSort") {
      TV.sortKey = t.value;
      touch();
    } else if (t.dataset.tvcol) {
      TV.cols[t.dataset.tvcol] = t.checked;
      TV.active = "";
      persistTV();
      renderTasksPage();
      $("tvPicker").hidden = false;
    }
  });
  on($("tvSaveForm"), "submit", (e: Event) => {
    e.preventDefault();
    const name = String($("tvName").value).trim().slice(0, 28);
    if (!name) return;
    const cfg = clone({ view: TV.view, group: TV.group, sortKey: TV.sortKey, dir: TV.dir, density: TV.density, status: TV.status, cols: TV.cols });
    SAVED = [...SAVED.filter((v) => v.name !== name), { name, cfg }];
    TV.active = name;
    persistTV();
    $("tvSaveForm").hidden = true;
    $("tvSaveBtn").hidden = false;
    renderTasksPage();
    ctx.toast(`Đã lưu view “${name}”`, "success");
  });
  on(document, "click", (e: Event) => {
    const t = e.target as HTMLElement;
    if (!t.closest("#tvColBtn,#tvPicker")) $("tvPicker").hidden = true;
    if (!t.closest("#tvViewPop,#tvViewBtn")) $("tvViewPop").classList.remove("open");
  });

  /* Kéo thả trên Kanban */
  let dragId: string | null = null;
  on(V, "dragstart", (e: DragEvent) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>(".kcard");
    if (!c || !e.dataTransfer) return;
    dragId = c.dataset.task ?? null;
    e.dataTransfer.setData("text/plain", dragId ?? "");
    e.dataTransfer.effectAllowed = "move";
    c.classList.add("dragging");
  });
  on(V, "dragend", () => {
    dragId = null;
    V.querySelectorAll(".dragging,.over").forEach((x: Element) => x.classList.remove("dragging", "over"));
  });
  on(V, "dragover", (e: DragEvent) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.kcol[data-status="1"]');
    if (c && dragId && c.dataset.col !== "overdue") {
      e.preventDefault();
      c.classList.add("over");
    }
  });
  on(V, "dragleave", (e: DragEvent) => {
    const c = (e.target as HTMLElement).closest(".kcol");
    if (c && !c.contains(e.relatedTarget as Node)) c.classList.remove("over");
  });
  on(V, "drop", (e: DragEvent) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.kcol[data-status="1"]');
    if (!c || !dragId) return;
    e.preventDefault();
    c.classList.remove("over");
    void setStatus(dragId, c.dataset.col ?? "");
    dragId = null;
  });

  /* View đã lưu: dạng menu thả xuống cho gọn */
  on($("tvViewBtn"), "click", (e: Event) => {
    e.stopPropagation();
    $("tvViewPop").classList.toggle("open");
  });
  on($("tvViews"), "click", (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-tvview]") && !t.closest("[data-tvdel]")) ctx.later(() => $("tvViewPop").classList.remove("open"), 0);
  });
  on(document, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") $("tvViewPop").classList.remove("open");
  });

  return { renderTasksPage, updateSecCollapseUI, setStatus, STO };
}
