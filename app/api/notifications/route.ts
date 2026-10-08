// app/api/notifications/route.ts
// GET /api/notifications — current user's notifications.
// PATCH /api/notifications — mark all read for current user.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listNotifications, markAllRead } from "@/lib/db/notifications";


export async function GET() {
  const session = await requireUser();
  const userId = session.userId;
  try {
    const items = await listNotifications(userId);
    return NextResponse.json(items);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH() {
  const session = await requireUser();
  const userId = session.userId;
  try {
    await markAllRead(userId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
