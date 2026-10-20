// app/api/decision-requests/[id]/route.ts
// PATCH /api/decision-requests/:id — resolve or cancel an open Blocker & Decision request.

import { NextResponse } from "next/server";
import { canResolveDecision } from "@/lib/auth/permissions";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { getDecisionRequestById, resolveDecisionRequest } from "@/lib/db/decision-requests";
import { error as logError } from "@/lib/logger";
import { syncPlannerBlockedPrefix } from "@/lib/planner/blocker-sync";
import { resolveDecisionRequestSchema } from "@/lib/schemas/decision-request";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireUser();
  const role = await getUserRole(session.userId);
  const { id } = await context.params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: "Mã yêu cầu không hợp lệ.", code: "invalid_input" }, { status: 400 });
  }

  const parsed = resolveDecisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu xử lý không hợp lệ.";
    return NextResponse.json({ error: msg, code: "invalid_input" }, { status: 400 });
  }

  try {
    const existing = await getDecisionRequestById(id);
    if (!existing || existing.status !== "open") {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu gỡ vướng đang mở.", code: "not_found" },
        { status: 404 },
      );
    }

    if (!canResolveDecision(role, existing, session.userId, parsed.data.action)) {
      return NextResponse.json(
        { error: "Bạn không có quyền xử lý yêu cầu gỡ vướng này.", code: "forbidden" },
        { status: 403 },
      );
    }

    if (
      parsed.data.action === "resolve" &&
      existing.type === "decision" &&
      !parsed.data.resolution.trim()
    ) {
      return NextResponse.json(
        { error: "Vui lòng ghi rõ quyết định để khép vòng với người báo.", code: "invalid_input" },
        { status: 400 },
      );
    }

    const updated = await resolveDecisionRequest(id, {
      action: parsed.data.action,
      resolution: parsed.data.resolution,
      actorId: session.userId,
    });

    const plannerSynced = await syncPlannerBlockedPrefix(existing.plannerTaskId, false);
    return NextResponse.json({ request: updated, plannerSynced });
  } catch (e: unknown) {
    logError("api.decision_requests.resolve_failed", {
      detail: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Không cập nhật được yêu cầu gỡ vướng.", code: "internal_error" },
      { status: 500 },
    );
  }
}
