// app/api/tasks/[id]/route.ts
// DELETE /api/tasks/[id] — delete a task.
// PATCH  /api/tasks/[id] — partial update via updateTaskSchema.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { deleteTask, updateTask } from "@/lib/db/tasks";
import { updateTaskSchema } from "@/lib/schemas/task";


export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await context.params;
  try {
    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const task = await updateTask(id, parsed.data);
    return NextResponse.json(task);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
