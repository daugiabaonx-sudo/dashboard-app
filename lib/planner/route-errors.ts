// lib/planner/route-errors.ts
// Maps Planner integration errors onto JSON responses for route handlers.
// Upstream details are logged server-side; clients get a stable `code`.

import "server-only";
import { NextResponse } from "next/server";
import { error as logError } from "@/lib/logger";
import { GraphError, PlannerConfigError, PlannerInputError, TokenError } from "./errors";

const CONSENT_HINT =
  "Microsoft Graph denied access. Grant admin consent for Tasks.Read.All / Tasks.ReadWrite.All (Application) on the app registration.";

export function plannerErrorResponse(e: unknown, context: string): NextResponse {
  if (e instanceof PlannerConfigError) {
    return NextResponse.json({ error: e.message, code: "planner_not_configured" }, { status: 503 });
  }
  if (e instanceof PlannerInputError) {
    return NextResponse.json({ error: e.message, code: "invalid_input" }, { status: 400 });
  }
  if (e instanceof TokenError) {
    logError("planner.token_failed", { context, code: e.code });
    return NextResponse.json({ error: e.message, code: e.code }, { status: 502 });
  }
  if (e instanceof GraphError) {
    logError("planner.graph_failed", { context, status: e.status, code: e.code, detail: e.message });
    if (e.status === 401 || e.status === 403) {
      return NextResponse.json({ error: CONSENT_HINT, code: e.code }, { status: 403 });
    }
    if (e.status === 404) {
      return NextResponse.json({ error: "Planner resource not found", code: e.code }, { status: 404 });
    }
    if (e.status === 412) {
      return NextResponse.json(
        { error: "Task was changed in Planner — reload and try again", code: e.code },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Microsoft Graph request failed", code: e.code }, { status: 502 });
  }
  logError("planner.unexpected", { context, detail: e instanceof Error ? e.message : String(e) });
  return NextResponse.json({ error: "Unexpected Planner error", code: "unexpected" }, { status: 500 });
}
