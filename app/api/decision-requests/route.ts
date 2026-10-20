// app/api/decision-requests/route.ts
// GET  /api/decision-requests — list open Blocker & Decision requests for the workspace
// POST /api/decision-requests — raise a new Blocker & Decision request ("Giơ tay")

import { NextResponse } from "next/server";
import { canRaiseBlocker } from "@/lib/auth/permissions";
import { getUserRole } from "@/lib/auth/role";
import { getCurrentWorkspaceId, requireUser } from "@/lib/auth/session";
import {
  createDecisionRequest,
  findOpenDecisionByTask,
  listOpenDecisionRequests,
} from "@/lib/db/decision-requests";
import { error as logError } from "@/lib/logger";
import { syncPlannerBlockedPrefix } from "@/lib/planner/blocker-sync";
import { createDecisionRequestSchema } from "@/lib/schemas/decision-request";

export async function GET() {
  await requireUser();
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const items = await listOpenDecisionRequests(workspaceId);
    return NextResponse.json(items);
  } catch (e: unknown) {
    logError("api.decision_requests.list_failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Không tải được danh sách yêu cầu gỡ vướng.", code: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await requireUser();
  const role = await getUserRole(session.userId);
  if (!canRaiseBlocker(role)) {
    return NextResponse.json(
      { error: "Người xem (Viewer) không có quyền báo vướng.", code: "forbidden" },
      { status: 403 },
    );
  }

  const parsed = createDecisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu báo vướng không hợp lệ.";
    return NextResponse.json({ error: msg, code: "invalid_input" }, { status: 400 });
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    const existing = await findOpenDecisionByTask(parsed.data.plannerTaskId, workspaceId);
    if (existing) {
      return NextResponse.json(
        { error: "Công việc này đã có yêu cầu gỡ vướng đang mở.", code: "conflict" },
        { status: 409 },
      );
    }

    const created = await createDecisionRequest({
      workspaceId,
      plannerTaskId: parsed.data.plannerTaskId,
      taskTitle: parsed.data.taskTitle,
      projectName: parsed.data.projectName,
      type: parsed.data.type,
      need: parsed.data.need,
      raisedBy: session.userId,
      unblockerId: parsed.data.unblockerId,
      neededBy: parsed.data.neededBy ?? null,
    });

    const plannerSynced = await syncPlannerBlockedPrefix(parsed.data.plannerTaskId, true);
    return NextResponse.json({ request: created, plannerSynced }, { status: 201 });
  } catch (e: unknown) {
    logError("api.decision_requests.create_failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Không tạo được yêu cầu gỡ vướng.", code: "internal_error" },
      { status: 500 },
    );
  }
}
