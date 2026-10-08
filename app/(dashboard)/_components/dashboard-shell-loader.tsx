// app/(dashboard)/_components/dashboard-shell-loader.tsx
// Streamed inner region of the dashboard layout. Sits inside the
// layout's <Suspense> boundary so the layout can stream the fallback
// skeleton immediately while the Planner dataset + user role resolve.
//
// Splitting this out of the layout keeps `requireUser()` (a cookies()
// read, so dynamic) at the layout edge, while the data-dependent shell
// is allowed to suspend and stream.

import type { ReactNode } from "react";
import { SxShell } from "@/components/sunext/sx-shell";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";
import { SidebarSkeleton } from "./sidebar-skeleton";

export async function DashboardShellLoader({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const [dataset, role] = await Promise.all([
    getSxViewDataset(),
    getUserRole(session.userId),
  ]);
  const shell = buildSxShell(session, dataset, role);
  return <SxShell {...shell}>{children}</SxShell>;
}

export function DashboardShellLoaderFallback() {
  return <SidebarSkeleton />;
}
