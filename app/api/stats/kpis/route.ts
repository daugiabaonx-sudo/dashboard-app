// app/api/stats/kpis/route.ts
// GET /api/stats/kpis — workspace KPIs.

import { NextResponse } from "next/server";
import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { getKpis } from "@/lib/db/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser();
  const workspaceId = await getCurrentWorkspaceId();
  try {
    const kpis = await getKpis(workspaceId);
    return NextResponse.json(kpis);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load KPIs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
