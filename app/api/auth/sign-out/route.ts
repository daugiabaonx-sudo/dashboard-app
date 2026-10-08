// app/api/auth/sign-out/route.ts
// POST /api/auth/sign-out — clears session and returns 200.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setSignedInUserId } from "@/lib/supabase/mock";
import { isMockMode } from "@/lib/supabase/env";


export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  if (isMockMode) setSignedInUserId(null);
  const res = NextResponse.json({ ok: true });
  if (isMockMode) res.cookies.delete("mock-sunext-auth");
  return res;
}
