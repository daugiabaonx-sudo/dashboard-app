// app/api/planner/plans/route.ts
// GET /api/planner/plans?groupId=<m365-group-id>
// Lists Planner plans owned by a Microsoft 365 group. Falls back to the
// PLANNER_GROUP_ID env var when no groupId query param is given, and to
// every plan in the tenant (tagged with groupId/groupName) when neither is set.

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listAllPlans, listGroupPlans } from "@/lib/planner/planner-api";
import { plannerErrorResponse } from "@/lib/planner/route-errors";


export async function GET(request: NextRequest) {
  await requireUser();
  const groupId =
    request.nextUrl.searchParams.get("groupId")?.trim() || process.env.PLANNER_GROUP_ID?.trim();
  try {
    const plans = groupId ? await listGroupPlans(groupId) : await listAllPlans();
    return NextResponse.json(plans);
  } catch (e: unknown) {
    return plannerErrorResponse(e, "planner.plans");
  }
}
