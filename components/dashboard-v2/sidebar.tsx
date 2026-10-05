"use client";

// v2 sidebar — 240px wide, theme-aware surface, liquid-metal nav items,
// 8 nav links. The active item keeps the brand-gradient background for
// accessibility (color + position) while the surrounding liquid border
// pulses around it. Hover state shows the liquid border + a sweep
// shimmer that follows the cursor.

import {
  Bell,
  CalendarDays,
  ChartBar,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ComponentType, type CSSProperties, type MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { SunextLogo } from "@/components/brand/sunext-logo";

interface NavItem {
  labelKey:
    | "sidebar.overview"
    | "sidebar.tasks"
    | "sidebar.projects"
    | "sidebar.employees"
    | "sidebar.reports"
    | "sidebar.calendar"
    | "sidebar.notifications"
    | "sidebar.settings";
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { labelKey: "sidebar.overview", href: "/", icon: LayoutDashboard },
  { labelKey: "sidebar.tasks", href: "/tasks", icon: ListChecks },
  { labelKey: "sidebar.projects", href: "/projects", icon: FolderKanban },
  { labelKey: "sidebar.employees", href: "/team", icon: Users },
  { labelKey: "sidebar.reports", href: "/reports", icon: ChartBar },
  { labelKey: "sidebar.calendar", href: "/calendar", icon: CalendarDays },
  { labelKey: "sidebar.notifications", href: "/notifications", icon: Bell },
  { labelKey: "sidebar.settings", href: "/settings", icon: Settings },
];

interface SidebarLabels {
  overview: string;
  tasks: string;
  projects: string;
  employees: string;
  reports: string;
  calendar: string;
  notifications: string;
  settings: string;
  statusOk: string;
  statusHint: string;
}

interface SidebarProps {
  labels: SidebarLabels;
}

type LiquidStyle = CSSProperties & {
  ["--mx"]?: string;
  ["--my"]?: string;
};

export function Sidebar({ labels }: SidebarProps) {
  const pathname = usePathname();
  // Per-item mouse position so the cursor-following gradient can move
  // between items without re-rendering the whole list.
  const [hoverPos, setHoverPos] = useState<Record<string, LiquidStyle>>({});

  const handleMouseMove = useCallback(
    (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      const mx = `${event.clientX - rect.left}px`;
      const my = `${event.clientY - rect.top}px`;
      setHoverPos((prev) => {
        const current = prev[href];
        // Skip the setState if nothing changed — keeps hover tracking free
        // when the cursor is idle over a nav item.
        if (current?.["--mx"] === mx && current?.["--my"] === my) return prev;
        return { ...prev, [href]: { ["--mx"]: mx, ["--my"]: my } };
      });
    },
    [],
  );

  const labelOf = (key: NavItem["labelKey"]) => {
    switch (key) {
      case "sidebar.overview":
        return labels.overview;
      case "sidebar.tasks":
        return labels.tasks;
      case "sidebar.projects":
        return labels.projects;
      case "sidebar.employees":
        return labels.employees;
      case "sidebar.reports":
        return labels.reports;
      case "sidebar.calendar":
        return labels.calendar;
      case "sidebar.notifications":
        return labels.notifications;
      case "sidebar.settings":
        return labels.settings;
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col",
        "border-r border-border bg-card/60 backdrop-blur-md",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <SunextLogo size="sm" />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Primary">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-nav-href={item.href}
              onMouseMove={handleMouseMove(item.href)}
              style={hoverPos[item.href]}
              className={cn(
                "nav-item-liquid group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-all",
                isActive
                  ? "active bg-brand text-white shadow-soft"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex-1">{labelOf(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-good opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-status-good" />
            </span>
            {labels.statusOk}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {labels.statusHint}
          </p>
        </div>
      </div>
    </aside>
  );
}