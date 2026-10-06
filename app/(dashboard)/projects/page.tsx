// "Dự án" — SUNEXT template project cards (sidebar.js#buildProjectsView).
// Cards link to the project detail page.

import type { Metadata } from "next";
import { SxProjectsView } from "@/components/sunext/sx-projects-view";
import { getSxPageData } from "@/lib/sx-page-data";

export const metadata: Metadata = { title: "Dự án · SUNEXT Dashboard" };

export default function ProjectsPage() {
  const { dataset } = getSxPageData();
  return <SxProjectsView dataset={dataset} />;
}
