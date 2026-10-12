"use client";

// components/v2/v2-app.tsx
// Client host of the SUNEXT Dashboard V2 template. Renders the template's
// static markup (no user data — see v2-markup.ts) and mounts the template
// engine on it with real Planner data. Writes go to Microsoft Planner via
// PATCH /api/planner/tasks/:id (role-gated server-side as well).

import { useEffect, useRef } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { plannerPatchFromEdit } from "@/lib/planner/planner-mapping";
import type { SxStatus, SxTask } from "@/lib/sx-dashboard";
import { v2StatusOf, type V2Model, type V2Status } from "@/lib/v2/v2-model";
import type { V2Hooks, V2Profile, V2SaveResult, V2View } from "./v2-context";
import { mountV2 } from "./v2-engine";
import { V2_MARKUP } from "./v2-markup";
import "./v2.css";

export interface V2AppProps {
  readonly model: V2Model;
  readonly profile: V2Profile;
  readonly canEdit: boolean;
  readonly view: V2View;
  readonly focusPid?: string;
  /** Planner tasks as loaded (originals for computing PATCH diffs). */
  readonly plannerTasks: readonly SxTask[];
  readonly etags: Readonly<Record<string, string>>;
}

const PATH_OF: Record<V2View, string> = { overview: "/", tasks: "/tasks", settings: "/settings" };
const SX_STATUS_OF: Record<V2Status, SxStatus> = {
  done: "completed",
  todo: "not_started",
  working: "in_progress",
  blocked: "blocked",
};

interface SaveResponse {
  task?: SxTask;
  etag?: string | null;
  error?: string;
}

export function V2App({ model, profile, canEdit, view, focusPid, plannerTasks, etags }: V2AppProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const originals = useRef(new Map(plannerTasks.map((t) => [t.id, t])));
  const etagRef = useRef<Record<string, string>>({ ...etags });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const hooks: V2Hooks = {
      async saveTask(pid, change): Promise<V2SaveResult> {
        const original = originals.current.get(pid);
        if (!original) return { ok: false, message: "Không tìm thấy công việc trên Microsoft Planner." };
        const patch = plannerPatchFromEdit(original, {
          status: SX_STATUS_OF[change.status],
          priority: original.priority,
          progress: change.progress,
          notes: original.notes,
        });
        if (!patch) return { ok: true, status: change.status, progress: change.progress };
        try {
          const res = await csrfFetch(`/api/planner/tasks/${encodeURIComponent(pid)}`, {
            method: "PATCH",
            body: { etag: etagRef.current[pid] ?? "", patch },
          });
          const json = (await res.json().catch(() => ({}))) as SaveResponse;
          if (!res.ok || !json.task) return { ok: false, message: json.error ?? "Không lưu được vào Microsoft Planner." };
          const saved: SxTask = { ...json.task, notes: original.notes };
          originals.current.set(pid, saved);
          if (json.etag) etagRef.current = { ...etagRef.current, [pid]: json.etag };
          return { ok: true, status: v2StatusOf(saved.status), progress: saved.progress };
        } catch {
          return { ok: false, message: "Mất kết nối — chưa lưu được vào Microsoft Planner." };
        }
      },
      async signOut() {
        try {
          const res = await csrfFetch("/api/auth/sign-out", { method: "POST" });
          // Hard navigation so the proxy re-evaluates the cleared session cookie.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          if (res.ok) window.location.assign("/login");
        } catch {
          /* network error — stay on the page; the engine shows no false success */
        }
      },
      navigate(next) {
        const path = PATH_OF[next];
        if (window.location.pathname !== path) window.history.pushState(null, "", path);
      },
    };

    const unmount = mountV2(host, { model, profile, canEdit, view, focusPid, hooks });
    return () => {
      unmount();
      // Restore pristine markup so a re-mount starts from the template state.
      host.innerHTML = V2_MARKUP;
    };
  }, [model, profile, canEdit, view, focusPid]);

  return <div ref={hostRef} className="v2-host" dangerouslySetInnerHTML={{ __html: V2_MARKUP }} suppressHydrationWarning />;
}
