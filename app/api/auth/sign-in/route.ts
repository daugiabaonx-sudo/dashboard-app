// app/api/auth/sign-in/route.ts
// POST /api/auth/sign-in — verifies credentials, sets session cookies via @supabase/ssr.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/schemas/auth";
import { setSignedInUserId } from "@/lib/supabase/mock";
import { isMockMode } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid credentials" },
      { status: 401 },
    );
  }

  if (isMockMode) setSignedInUserId(data.user.id);

  const meta = (data.user.user_metadata ?? {}) as { full_name?: string };
  const res = NextResponse.json({
    userId: data.user.id,
    email: data.user.email ?? parsed.data.email,
    fullName: meta.full_name ?? data.user.email?.split("@")[0] ?? "User",
  });

  if (isMockMode) {
    res.cookies.set("mock-sunext-auth", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return res;
}
