// app/api/auth/sign-up/route.ts
// POST /api/auth/sign-up — creates a user, signs in, returns session.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/schemas/auth";
import { setSignedInUserId } from "@/lib/supabase/mock";
import { isMockMode } from "@/lib/supabase/env";


export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const initials = parsed.data.fullName
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName, initials } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data.user) {
    return NextResponse.json({ error: "Sign up failed" }, { status: 400 });
  }

  if (isMockMode) setSignedInUserId(data.user.id);

  return NextResponse.json({
    userId: data.user.id,
    email: data.user.email ?? parsed.data.email,
    fullName: parsed.data.fullName,
  });
}
