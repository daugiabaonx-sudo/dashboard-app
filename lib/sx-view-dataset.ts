// lib/sx-view-dataset.ts
// Dataset for every dashboard page: real Microsoft Planner data only.
// When Planner is not configured or fails to load, pages get an EMPTY
// dataset plus a visible note — never the in-app demo data.
//
// Two dedup layers around `getSxViewDataset` so navigation between
// dashboard pages is instant:
//   1. `React.cache(...)` — dedupes calls *within a single request*.
//      Layout and child page both call this; only the first runs.
//   2. `'use cache'` + `cacheLife('minutes')` — dedupes *across requests*
//      while `cacheComponents` is on, revalidating about once a minute so
//      tasks added directly in Planner show up within minutes. Writes
//      through the dashboard revalidate PLANNER_DATASET_TAG right away;
//      the in-process cache in lib/planner/planner-dataset.ts
//      (CACHE_TTL_MS) still bounds bursty in-instance Graph reads.

import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { error as logError } from "@/lib/logger";
import { PLANNER_DATASET_TAG } from "@/lib/planner/cache-tag";
import { isPlannerConfigured } from "@/lib/planner/config";
import { loadPlannerDataset } from "@/lib/planner/planner-dataset";
import type { SxDataset } from "@/lib/sx-dashboard";

const NOT_CONFIGURED_NOTE =
  "Chưa cấu hình Microsoft Planner (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET) — chưa có dữ liệu để hiển thị.";
const FAILED_NOTE = "Không tải được dữ liệu Microsoft Planner — vui lòng tải lại trang sau ít phút.";

/** A Planner dataset with no records, carrying a note for the page header. */
export function emptyPlannerDataset(note: string): SxDataset {
  return {
    source: "planner",
    employees: [],
    projects: [],
    tasks: [],
    blockers: [],
    projectHealth: [],
    notifications: [],
    projectLinks: {},
    taskEtags: {},
    sourceNote: note,
  };
}

export const getSxViewDataset = cache(async (): Promise<SxDataset> => {
  "use cache";
  cacheLife("minutes");
  cacheTag(PLANNER_DATASET_TAG);
  if (!isPlannerConfigured()) return emptyPlannerDataset(NOT_CONFIGURED_NOTE);
  try {
    return await loadPlannerDataset();
  } catch (e: unknown) {
    logError("planner.dataset_failed", { detail: e instanceof Error ? e.message : String(e) });
    return emptyPlannerDataset(FAILED_NOTE);
  }
});
