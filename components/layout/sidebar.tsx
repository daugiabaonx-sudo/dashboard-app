"use client";

import {
  CalendarDays,
  ChartBar,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban, badge: "5" },
  { label: "Tasks", href: "/tasks", icon: ListChecks, badge: "12" },
  { label: "Team", href: "/team", icon: Users },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Reports", href: "/reports", icon: ChartBar },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "flex flex-col w-64 h-full",
        "border-r border-border bg-card/60 backdrop-blur-sm",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-border">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <KanbanSquare className="size-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">SUNEXT</span>
          <span className="text-[11px] text-muted-foreground">Operations</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Primary">
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
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {item.badge}
                </span>
              )}
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
            All systems operational
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Realtime sync active · last incident 14d ago
          </p>
        </div>
      </div>
    </aside>
  );
}
