// Home page — SUNEXT "dark futuristic" template, rendered 1:1 from
// Dashboard Sunext/dashboard_sunext_dark_futuristic_one_screen_balanced.html.
// The shell (sidebar + topbar) lives in the (dashboard) layout; every section
// reuses the template's exact markup + stylesheet (components/sunext/*).

import type { Metadata } from "next";
import { SxOverview } from "@/components/sunext/sx-overview";
import { requireUser } from "@/lib/auth/session";
import { getSxPageData } from "@/lib/sx-page-data";

export const metadata: Metadata = {
  title: "SUNEXT Dashboard",
  description: "SUNEXT Team Management Dashboard",
};

export default async function DashboardPage() {
  const session = await requireUser();
  const { dataset, shell } = getSxPageData(session);
  return <SxOverview dataset={dataset} profileName={shell.profile.name} />;
}