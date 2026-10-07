// "Nhân viên" — SUNEXT template employee cards (sidebar.js#buildEmployeesView),
// built from Microsoft Planner task assignees.

import type { Metadata } from "next";
import { SxEmployeesView } from "@/components/sunext/sx-employees-view";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = { title: "Nhân viên · SUNEXT Dashboard" };

export default async function TeamPage() {
  const dataset = await getSxViewDataset();
  return <SxEmployeesView dataset={dataset} />;
}

export const dynamic = "force-dynamic";
