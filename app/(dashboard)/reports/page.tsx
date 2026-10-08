// "Báo cáo" — completion, velocity, project health and overdue work computed
// from Microsoft Planner data (lib/sx-reports.ts).

import type { Metadata } from "next";
import { connection } from "next/server";
import { ReportsView } from "@/components/reports/reports-view";
import { vnTodayKey } from "@/lib/sx-dates";
import { buildSxReport } from "@/lib/sx-reports";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = { title: "Báo cáo · SUNEXT Dashboard" };

export default async function ReportsPage() {
  // `connection()` opts the page into request-time rendering so the
  // current-day key is always accurate. Under `cacheComponents` the
  // page-level layout + skeleton still prerender; only this function
  // body runs per request.
  await connection();
  const dataset = await getSxViewDataset();
  const report = buildSxReport(dataset, vnTodayKey());
  return <ReportsView report={report} note={dataset.sourceNote} />;
}
