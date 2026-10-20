// lib/planner/blocker-sync.ts
// Narrow server-side synchronization of the `[Bị chặn] ` title prefix on
// Microsoft Planner when a human-raised DecisionRequest is created or resolved.
//
// Security boundary: this helper ONLY modifies the `title` prefix via
// `blockedTitlePatch(title, blocked)`. It never changes assignees, deadlines,
// priorities, or percentComplete. Any Graph failure is logged and returns
// `false` so the DecisionRequest in Supabase remains the source of truth.

import "server-only";
import { revalidateTag } from "next/cache";
import { warn } from "@/lib/logger";
import { PLANNER_DATASET_TAG } from "./cache-tag";
import { GraphError } from "./errors";
import { getTask, updateTask } from "./planner-api";
import { invalidatePlannerSource } from "./planner-dataset";
import { blockedTitlePatch } from "./planner-mapping";

export async function syncPlannerBlockedPrefix(
  plannerTaskId: string,
  blocked: boolean,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const task = await getTask(plannerTaskId);
      const patch = blockedTitlePatch(task.title, blocked);
      if (!patch) return true;
      const etag = task["@odata.etag"] ?? "";
      if (!etag) return false;
      await updateTask(plannerTaskId, etag, patch);
      invalidatePlannerSource();
      revalidateTag(PLANNER_DATASET_TAG, "max");
      return true;
    } catch (e: unknown) {
      if (attempt === 0 && e instanceof GraphError && e.status === 412) {
        continue;
      }
      warn("planner.blocker_prefix_sync_failed", {
        plannerTaskId,
        blocked,
        detail: e instanceof Error ? e.message : String(e),
      });
      return false;
    }
  }
  return false;
}
