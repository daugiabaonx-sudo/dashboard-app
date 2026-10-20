// components/v2/v2-engine.ts
// Mounts the SUNEXT Dashboard V2 template behaviour onto its static markup
// (v2-markup.ts) with real Planner data. Mirrors the template's boot order:
// renderNav → renderHeads → renderAll → initSecCollapse → effects.
// Every listener/timer is registered through the context so unmount (and
// React Strict Mode's double effect run) leaves no residue.

import type { DecisionRequest } from "@/lib/types";
import type { V2DecisionMember } from "@/lib/v2/v2-decisions";
import type { V2Model } from "@/lib/v2/v2-model";
import type { V2Ctx, V2Hooks, V2Profile, V2State, V2View } from "./v2-context";
import { createHelpers, startOfToday } from "./v2-core";
import { createToaster, installEffects, markSearch, stagger } from "./v2-effects";
import {
  filtered,
  installOverview,
  openModal,
  openRaiseModal,
  renderBlockers,
  renderNav,
  renderOverview,
  renderProjects,
  showView,
} from "./v2-overview";
import { installTasks } from "./v2-tasks";

export interface V2MountOptions {
  readonly model: V2Model;
  readonly profile: V2Profile;
  readonly canEdit: boolean;
  readonly canRaise?: boolean;
  readonly decisions?: readonly DecisionRequest[];
  readonly members?: readonly V2DecisionMember[];
  readonly view: V2View;
  /** Planner task id to open in the modal on load (`?focus=`). */
  readonly focusPid?: string;
  readonly hooks: V2Hooks;
  readonly now?: Date;
}

export function mountV2(root: HTMLElement, opts: V2MountOptions): () => void {
  const disposers: (() => void)[] = [];
  let alive = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- template DOM is untyped (see V2Ctx.$)
  const byId = (id: string): any => root.querySelector(`#${id}`);

  const S: V2State = {
    q: "",
    period: "all",
    team: "all",
    project: "all",
    view: opts.view,
    tSort: { key: "risk", dir: 1 },
    cols: { owner: true, deadline: true, risk: true, status: true },
    pSort: { key: "", dir: 1 },
    pPage: 1,
    pSize: 4,
    bSort: { key: "wait", dir: -1 },
    bTab: null,
    openBk: new Set(),
    modalId: null,
    resolvingId: null,
    saving: false,
  };

  let tasksApi: ReturnType<typeof installTasks> | null = null;
  const ctx: V2Ctx = {
    root,
    $: byId,
    on(target, type, fn, o) {
      target.addEventListener(type, fn as EventListener, o);
      disposers.push(() => target.removeEventListener(type, fn as EventListener, o));
    },
    later(fn, ms) {
      const id = setTimeout(() => {
        if (alive) fn();
      }, ms);
      disposers.push(() => clearTimeout(id));
    },
    alive: () => alive,
    model: opts.model,
    TASKS: [...opts.model.tasks],
    DECISIONS: opts.decisions ? [...opts.decisions] : [],
    MEMBERS: opts.members ?? [],
    PROJECTS: opts.model.projects,
    BLOCKERS: opts.model.blockers,
    h: createHelpers(startOfToday(opts.now)),
    now: opts.now ?? new Date(),
    S,
    canEdit: opts.canEdit,
    canRaise: opts.canRaise ?? true,
    profile: opts.profile,
    hooks: opts.hooks,
    render: {
      all() {
        const list = filtered(ctx);
        renderOverview(ctx, list);
        if (S.view === "tasks") tasksApi?.renderTasksPage();
        tasksApi?.updateSecCollapseUI();
        byId("resetBtn").hidden = !(S.q || S.period !== "all" || S.team !== "all" || S.project !== "all");
        ctx.after();
      },
      tasksPage: () => tasksApi?.renderTasksPage(),
      blockers: () => renderBlockers(ctx),
      projects: () => renderProjects(ctx),
      secUI: () => tasksApi?.updateSecCollapseUI(),
      nav: () => renderNav(ctx),
      showView: (v) => showView(ctx, v),
    },
    after() {
      stagger(root);
      markSearch(root, S.q);
    },
    toast: () => undefined,
    filtered: () => filtered(ctx),
    openModal: (id) => openModal(ctx, id),
    openRaiseModal: (pid) => openRaiseModal(ctx, pid),
    setStatus: (id, key) => void tasksApi?.setStatus(id, key),
  };
  ctx.toast = createToaster(root);

  renderNav(ctx);
  installOverview(ctx);
  tasksApi = installTasks(ctx);
  ctx.render.all();
  showView(ctx, opts.view);
  tasksApi.updateSecCollapseUI();
  installEffects(ctx);
  if (opts.model.sourceNote) ctx.toast(opts.model.sourceNote, "warning");

  if (opts.focusPid) {
    const t = ctx.TASKS.find((x) => x.pid === opts.focusPid);
    if (t) openModal(ctx, t.id);
  }

  // Browser back/forward between tabs (URL is updated via history.pushState).
  ctx.on(window, "popstate", () => {
    const path = window.location.pathname;
    const view: V2View = path.startsWith("/tasks") ? "tasks" : path.startsWith("/settings") ? "settings" : "overview";
    if (view !== S.view) showView(ctx, view);
  });

  // Live ticker: refresh "Đã chờ" wait-age badges every 30s when running with real clock.
  if (!opts.now) {
    const tickId = setInterval(() => {
      if (!alive) return;
      ctx.now = new Date();
      renderBlockers(ctx);
    }, 30_000);
    disposers.push(() => clearInterval(tickId));
  }

  return () => {
    alive = false;
    disposers.splice(0).forEach((d) => d());
  };
}
