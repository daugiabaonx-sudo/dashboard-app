// app/api/projects/route.ts
// GET  /api/projects — list the workspace's projects.
// POST /api/projects — create a project for the workspace.

import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/db/projects";
import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { createProjectSchema } from "@/lib/schemas/project";


export async function GET() {
  await requireUser();
  try {
    const projects = await listProjects();
    return NextResponse.json(projects);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireUser();
  const workspaceId = await getCurrentWorkspaceId();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Owner defaults to the current user if the client didn't supply one.
  const input = { ownerId: session.userId, ...(body as object) };
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const project = await createProject(workspaceId, parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
