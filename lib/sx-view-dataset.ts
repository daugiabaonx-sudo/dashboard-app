// lib/sx-view-dataset.ts
// Dataset for the Projects / Tasks template views: real Microsoft Planner
// data when MS_* credentials are configured, otherwise the in-app dataset.
// If Planner fails, falls back to the in-app dataset with a visible note
// instead of breaking the page.

import "server-only";
import { error as logError } from "@/lib/logger";
import { isPlannerConfigured } from "@/lib/planner/config";
import { loadPlannerDataset } from "@/lib/planner/planner-dataset";
import type { SxDataset } from "@/lib/sx-dashboard";
import { getSxPageData } from "@/lib/sx-page-data";

const FALLBACK_NOTE = "Không tải được dữ liệu Microsoft Planner — đang hiển thị dữ liệu mẫu.";

export async function getSxViewDataset(): Promise<SxDataset> {
  if (!isPlannerConfigured()) return getSxPageData().dataset;
  try {
    return await loadPlannerDataset();
  } catch (e: unknown) {
    logError("planner.dataset_failed", { detail: e instanceof Error ? e.message : String(e) });
    return { ...getSxPageData().dataset, sourceNote: FALLBACK_NOTE };
  }
}
