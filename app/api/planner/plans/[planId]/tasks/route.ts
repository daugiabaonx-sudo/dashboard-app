// app/api/planner/plans/[planId]/tasks/route.ts
// GET /api/planner/plans/:planId/tasks — tasks + buckets of one plan,
// fetched in parallel so the UI can render a board in one round-trip.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listPlanBuckets, listPlanTasks } from "@/lib/planner/planner-api";
import { plannerErrorResponse } from "@/lib/planner/route-errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  await requireUser();
  const { planId } = await context.params;
  try {
    const [tasks, buckets] = await Promise.all([listPlanTasks(planId), listPlanBuckets(planId)]);
    return NextResponse.json({ planId, buckets, tasks });
  } catch (e: unknown) {
    return plannerErrorResponse(e, "planner.plan_tasks");
  }
}
