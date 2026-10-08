import type { ReactNode } from "react";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { DashboardShellLoader, DashboardShellLoaderFallback } from "./_components/dashboard-shell-loader";

// Every dashboard route shares the SUNEXT template shell (sidebar + topbar).
// Template views render in its one-screen `.content`; legacy pages (reports,
// calendar, detail pages) render in a scrollable dark wrapper — see
// components/sunext/sx-shell.tsx.
//
// With `cacheComponents: true` in next.config.ts, the layout must not call
// runtime APIs (`cookies()`, `headers()`, ...) directly — that would block
// prerendering of the whole tree. `requireUser()` (which reads cookies)
// lives inside DashboardShellLoader, which is itself wrapped in a
// <Suspense> boundary below. The layout stays a static shell so the
// sidebar + topbar + children prerender; the data-driven shell streams
// in when the cached dataset resolves.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<DashboardShellLoaderFallback />}>
        <DashboardShellLoader>{children}</DashboardShellLoader>
      </Suspense>
      <Toaster richColors theme="dark" position="top-right" />
    </>
  );
}
