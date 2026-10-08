// app/api/tasks/[id]/status/route.ts
// PATCH /api/tasks/[id]/status — update task status (kanban drag).

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { setTaskStatus } from "@/lib/db/tasks";
import { taskStatusUpdateSchema } from "@/lib/schemas/task";


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
  const parsed = taskStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const task = await setTaskStatus(id, parsed.data.status);
    return NextResponse.json(task);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
