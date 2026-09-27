// app/api/projects/[id]/route.ts
// GET /api/projects/[id] — fetch a single project.

import { NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await context.params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}
