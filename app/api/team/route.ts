// app/api/team/route.ts
// GET /api/team — workspace team profiles.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listProfiles } from "@/lib/db/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser();
  try {
    const users = await listProfiles();
    return NextResponse.json(users);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
