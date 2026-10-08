// app/api/projects/[id]/route.ts
// GET  /api/projects/[id]    — fetch a single project.
// PATCH /api/projects/[id]   — partial update via updateProjectSchema.

import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { updateProjectSchema } from "@/lib/schemas/project";
import { requireUser } from "@/lib/auth/session";


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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const project = await updateProject(id, parsed.data);
    return NextResponse.json(project);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
