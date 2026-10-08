// app/api/stats/workload/route.ts
// GET /api/stats/workload — team workload per assignee.

import { NextResponse } from "next/server";
import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { getTeamWorkload } from "@/lib/db/stats";


export async function GET() {
  await requireUser();
  const workspaceId = await getCurrentWorkspaceId();
  try {
    const rows = await getTeamWorkload(workspaceId);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load workload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
