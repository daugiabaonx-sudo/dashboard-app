// app/(dashboard)/_components/sidebar-skeleton.tsx
// Skeleton shown while the dashboard shell's Planner dataset resolves.
// Matches the SxShell sidebar/topbar footprint (240px rail + 64px topbar)
// so the page does not jump when the real shell streams in.

export function SidebarSkeleton() {
  return (
    <div className="sx-root dark" data-shell-skeleton="true">
      <div className="app flex min-h-screen w-full">
        <aside
          className="sidebar flex w-[240px] shrink-0 flex-col gap-4 border-r border-border bg-card p-4"
          aria-busy="true"
          aria-label="Đang tải thanh điều hướng"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
              <div className="h-2 w-16 animate-pulse rounded bg-muted/30" />
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted/30" />
            ))}
          </div>
          <div className="mt-auto flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-muted/40" />
              <div className="h-2 w-12 animate-pulse rounded bg-muted/30" />
            </div>
          </div>
        </aside>
        <div className="flex-1">
          <div className="topbar h-16 border-b border-border bg-card" />
          <main className="bg-background p-6">
            <div className="space-y-4">
              <div className="h-6 w-40 animate-pulse rounded bg-muted/40" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted/30" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-md bg-muted/30" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
