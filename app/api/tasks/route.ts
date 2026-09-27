// app/api/tasks/route.ts
// GET  /api/tasks?groupBy=status — list tasks for the workspace.
// POST /api/tasks — create a task for the workspace.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser, getCurrentWorkspaceId } from "@/lib/auth/session";
import { createTask, listTasks, listTasksByStatus } from "@/lib/db/tasks";
import { createTaskSchema } from "@/lib/schemas/task";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireUser();
  const search = request.nextUrl.searchParams;
  const groupBy = search.get("groupBy");
  await getCurrentWorkspaceId();
  try {
    if (groupBy === "status") {
      const grouped = await listTasksByStatus();
      return NextResponse.json(grouped);
    }
    const tasks = await listTasks();
    return NextResponse.json(tasks);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireUser();
  const workspaceId = await getCurrentWorkspaceId();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Reporter defaults to the current user if the client didn't supply one.
  const input = { reporterId: session.userId, ...(body as object) };
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const task = await createTask(workspaceId, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
