// "Công việc" — SUNEXT template task list (sidebar.js#buildTasksView).
// `?focus=<taskId>` opens that task's modal (deep links from notifications
// and the calendar).

import type { Metadata } from "next";
import { SxTasksView } from "@/components/sunext/sx-tasks-view";
import { getSxPageData } from "@/lib/sx-page-data";

export const metadata: Metadata = { title: "Công việc · SUNEXT Dashboard" };

interface TasksPageProps {
  searchParams: Promise<{ focus?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const focusId = typeof params.focus === "string" ? params.focus : undefined;
  const { dataset } = getSxPageData();
  return <SxTasksView dataset={dataset} focusId={focusId} />;
}

export const dynamic = "force-dynamic";
