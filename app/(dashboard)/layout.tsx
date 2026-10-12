import type { ReactNode } from "react";
import { Suspense } from "react";
import { V2PageFallback } from "@/components/v2/v2-page";

// Every dashboard route renders the SUNEXT Dashboard V2 template
// (components/v2/*), which brings its own sidebar, topbar, modal and toasts.
//
// With `cacheComponents: true` in next.config.ts, runtime APIs (`cookies()`
// via requireUser, `searchParams`) must sit under a <Suspense> boundary —
// the pages do that work, so the layout only provides the boundary.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<V2PageFallback />}>{children}</Suspense>;
}
