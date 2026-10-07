// Home page — SUNEXT "dark futuristic" template, rendered 1:1 from
// Dashboard Sunext/dashboard_sunext_dark_futuristic_one_screen_balanced.html.
// The shell (sidebar + topbar) lives in the (dashboard) layout; every section
// reuses the template's exact markup + stylesheet (components/sunext/*).
// Data: Microsoft Planner only (empty + note when Planner is unavailable).

import type { Metadata } from "next";
import { SxOverview } from "@/components/sunext/sx-overview";
import { requireUser } from "@/lib/auth/session";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = {
  title: "SUNEXT Dashboard",
  description: "SUNEXT Team Management Dashboard",
};

export default async function DashboardPage() {
  const session = await requireUser();
  const dataset = await getSxViewDataset();
  const { profile } = buildSxShell(session, dataset);
  return <SxOverview dataset={dataset} profileName={profile.name} />;
}

export const dynamic = "force-dynamic";