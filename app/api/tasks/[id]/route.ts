// app/api/tasks/[id]/route.ts
// DELETE /api/tasks/[id] — delete a task.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { deleteTask } from "@/lib/db/tasks";

export const dynamic = "force-dynamic";

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
