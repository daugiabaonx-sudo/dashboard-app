import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { SxShell } from "@/components/sunext/sx-shell";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

// Every dashboard route shares the SUNEXT template shell (sidebar + topbar).
// Template views render in its one-screen `.content`; legacy pages (reports,
// calendar, detail pages) render in a scrollable dark wrapper — see
// components/sunext/sx-shell.tsx.
// Sidebar teams / projects come from Microsoft Planner (cached 60s in
// lib/planner/planner-dataset.ts, so pages reuse the same load).
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireUser();
  const [dataset, role] = await Promise.all([getSxViewDataset(), getUserRole(session.userId)]);
  const shell = buildSxShell(session, dataset, role);
  return (
    <>
      <SxShell {...shell}>{children}</SxShell>
      <Toaster richColors theme="dark" position="top-right" />
    </>
  );
}

export const dynamic = "force-dynamic";
