// app/api/session/route.ts
// Returns the active session JSON or 401 when unauthenticated.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";


export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json(session);
}
