// app/api/activity/route.ts
// GET /api/activity — recent workspace activity.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listRecentActivity } from "@/lib/db/activity";


export async function GET() {
  await requireUser();
  try {
    const items = await listRecentActivity(12);
    return NextResponse.json(items);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
