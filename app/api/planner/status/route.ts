// app/api/planner/status/route.ts
// GET /api/planner/status — connection diagnostics for the Microsoft
// Planner integration. Never returns secrets; reports whether the env is
// configured, whether a token can be issued, and which application
// permissions (JWT `roles`) admin consent has actually granted.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { readPlannerConfig } from "@/lib/planner/config";
import { PlannerConfigError } from "@/lib/planner/errors";
import { plannerErrorResponse } from "@/lib/planner/route-errors";
import { getGraphToken, readTokenRoles } from "@/lib/planner/token";

export const dynamic = "force-dynamic";

const READ_ROLES = ["Tasks.Read.All", "Tasks.ReadWrite.All"];

export async function GET() {
  await requireUser();

  let config;
  try {
    config = readPlannerConfig();
  } catch (e: unknown) {
    if (!(e instanceof PlannerConfigError)) return plannerErrorResponse(e, "planner.status");
    return NextResponse.json({
      configured: false,
      connected: false,
      canRead: false,
      canWrite: false,
      roles: [],
      message: e.message,
    });
  }

  try {
    const roles = readTokenRoles(await getGraphToken(config));
    const canRead = roles.some((r) => READ_ROLES.includes(r));
    const canWrite = roles.includes("Tasks.ReadWrite.All");
    return NextResponse.json({
      configured: true,
      connected: true,
      canRead,
      canWrite,
      roles,
      message: canRead
        ? "Connected to Microsoft Planner"
        : "Token issued but no Tasks.* application permission is granted yet — an admin must click “Grant admin consent”.",
    });
  } catch (e: unknown) {
    return plannerErrorResponse(e, "planner.status");
  }
}
