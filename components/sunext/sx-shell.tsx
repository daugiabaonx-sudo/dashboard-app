"use client";

// SUNEXT template shell: `.sx-root > .app > aside.sidebar + main.main`.
//
// Mounted once in app/(dashboard)/layout.tsx so filters, toasts and the
// sidebar persist across navigations (like the template's in-page views).
// The layout variant comes from the route (lib/sx-views#sxVariantFor):
// - "overview" adds `.sx-ov`, which enables the template's content styles
//   (KPI cards, panels, modal) and the one-screen `.content` layout.
// - "page" renders legacy Tailwind pages (reports, calendar, detail pages)
//   in a scrollable `.sx-page.dark` wrapper with only the shell styles.

import "./sx-base.css";
import "./sx-theme.css";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SX_DEFAULT_FILTERS, type SxFilters, type SxNotification, type SxPeriod } from "@/lib/sx-dashboard";
import { sxVariantFor } from "@/lib/sx-views";
import { SxShellContext, SxToastContainer, useSxToasts } from "./sx-shell-context";
import { SxSidebar } from "./sx-sidebar";
import { PERIOD_OPTIONS, SxTopbar, type SxProfile } from "./sx-topbar";

export interface SxShellProps {
  profile: SxProfile;
  notifications: SxNotification[];
  teams: string[];
  projects: string[];
  children: ReactNode;
}

const SEARCH_DEBOUNCE_MS = 280;

export function SxShell({ profile, notifications, teams, projects, children }: SxShellProps) {
  const pathname = usePathname();
  const [filters, setFilters] = useState<SxFilters>(SX_DEFAULT_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menusCloseKey, setMenusCloseKey] = useState(0);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<number | undefined>(undefined);
  const { toasts, showToast } = useSxToasts();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => setSidebarOpen(false), [pathname]);

  // ⌘K / Ctrl+K focuses search, Escape closes sidebar + menus (app.js).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setMenusCloseKey((k) => k + 1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const onSearch = useCallback((value: string) => {
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: value }));
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const onPeriod = useCallback(
    (period: SxPeriod) => {
      setFilters((f) => ({ ...f, period }));
      const label = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";
      showToast(`Đã chuyển sang ${label.toLowerCase()}.`);
    },
    [showToast],
  );

  const onTeam = useCallback(
    (team: string) => {
      setFilters((f) => ({ ...f, team }));
      showToast(team === "all" ? "Đang hiển thị tất cả team." : `Đã lọc team ${team}.`);
    },
    [showToast],
  );

  const onProject = useCallback(
    (project: string) => {
      setFilters((f) => ({ ...f, project }));
      showToast(project === "all" ? "Đang hiển thị tất cả dự án." : `Đã chọn dự án ${project}.`);
    },
    [showToast],
  );

  const ctx = useMemo(() => ({ filters, showToast, portalEl }), [filters, showToast, portalEl]);
  const isOverview = sxVariantFor(pathname ?? "") === "overview";

  return (
    <SxShellContext.Provider value={ctx}>
      <div className={isOverview ? "sx-root sx-ov" : "sx-root"}>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7437ec" />
              <stop offset="100%" stopColor="#24c6ff" />
            </linearGradient>
          </defs>
        </svg>

        <div className="app">
          <SxSidebar open={sidebarOpen} unreadNotifications={unread} onNavigate={() => setSidebarOpen(false)} />
          <div
            className={sidebarOpen ? "sidebar-overlay open" : "sidebar-overlay"}
            id="sidebarOverlay"
            onClick={() => setSidebarOpen(false)}
          />

          <main className="main">
            <SxTopbar
              profile={profile}
              notifications={notifications}
              teams={teams}
              projects={projects}
              searchRef={searchRef}
              period={filters.period}
              team={filters.team}
              project={filters.project}
              menusOpenKey={menusCloseKey}
              onSearch={onSearch}
              onPeriod={onPeriod}
              onTeam={onTeam}
              onProject={onProject}
              onOpenSidebar={() => setSidebarOpen(true)}
              showToast={showToast}
            />
            {isOverview ? (
              <div className="content">{children}</div>
            ) : (
              <div className="sx-page dark">{children}</div>
            )}
          </main>
        </div>

        <div ref={setPortalEl} className="sx-portal" />
        <SxToastContainer toasts={toasts} />
      </div>
    </SxShellContext.Provider>
  );
}
