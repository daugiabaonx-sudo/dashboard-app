// "Dự án" — SUNEXT template project cards (sidebar.js#buildProjectsView).
// Cards link to the project detail page, or — when Microsoft Planner is
// configured — show every Planner plan and open it in Planner.

import type { Metadata } from "next";
import { SxProjectsView } from "@/components/sunext/sx-projects-view";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = { title: "Dự án · SUNEXT Dashboard" };

export default async function ProjectsPage() {
  const dataset = await getSxViewDataset();
  return <SxProjectsView dataset={dataset} />;
}
