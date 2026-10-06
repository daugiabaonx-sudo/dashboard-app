import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { requireUser } from "@/lib/auth/session";
import { SxShell } from "@/components/sunext/sx-shell";
import { getSxPageData } from "@/lib/sx-page-data";

// Every dashboard route shares the SUNEXT template shell (sidebar + topbar).
// Template views render in its one-screen `.content`; legacy pages (reports,
// calendar, detail pages) render in a scrollable dark wrapper — see
// components/sunext/sx-shell.tsx.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireUser();
  const { shell } = getSxPageData(session);
  return (
    <>
      <SxShell {...shell}>{children}</SxShell>
      <Toaster richColors theme="dark" position="top-right" />
    </>
  );
}
