// "Dự án & Công việc" — SUNEXT Dashboard V2 template.
// `?focus=<plannerTaskId>` opens that task's modal (deep links).

import type { Metadata } from "next";
import { Suspense } from "react";
import { V2Page, V2PageFallback } from "@/components/v2/v2-page";

export const metadata: Metadata = { title: "Dự án & Công việc · SUNEXT Dashboard" };

interface TasksPageProps {
  searchParams: Promise<{ focus?: string }>;
}

async function TasksView({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const focusPid = typeof params.focus === "string" ? params.focus.slice(0, 200) : undefined;
  return <V2Page view="tasks" focusPid={focusPid} />;
}

// searchParams is runtime data: read it under this page's own <Suspense>.
export default function TasksPage({ searchParams }: TasksPageProps) {
  return (
    <Suspense fallback={<V2PageFallback />}>
      <TasksView searchParams={searchParams} />
    </Suspense>
  );
}
