// app/api/planner/tasks/[taskId]/route.ts
// PATCH /api/planner/tasks/:taskId — body { etag, patch } — writes a task
// change back to Microsoft Planner. `patch` is validated by
// planner-api#updateTask (taskPatchSchema). Returns the task mapped to the
// dashboard shape plus the new ETag for the next edit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditPlanner } from "@/lib/auth/permissions";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { updateTask } from "@/lib/planner/planner-api";
import { invalidatePlannerSource } from "@/lib/planner/planner-dataset";
import { mapPlannerTask } from "@/lib/planner/planner-mapping";
import { plannerErrorResponse } from "@/lib/planner/route-errors";
import type { PlannerTaskPatch } from "@/lib/planner/types";


const bodySchema = z.object({
  etag: z.string().min(1).max(512),
  patch: z.record(z.string(), z.unknown()),
});

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const session = await requireUser();
  if (!canEditPlanner(await getUserRole(session.userId))) {
    return NextResponse.json(
      { error: "Chỉ Owner, Admin hoặc Manager được sửa công việc trên Microsoft Planner.", code: "forbidden" },
      { status: 403 },
    );
  }
  const { taskId } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body must be { etag, patch }", code: "invalid_input" }, { status: 400 });
  }
  try {
    const updated = await updateTask(taskId, parsed.data.etag, parsed.data.patch as PlannerTaskPatch);
    invalidatePlannerSource();
    return NextResponse.json({
      task: mapPlannerTask(updated, Date.now()),
      etag: updated["@odata.etag"] ?? null,
    });
  } catch (e: unknown) {
    return plannerErrorResponse(e, "planner.task_update");
  }
}
