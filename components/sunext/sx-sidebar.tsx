"use client";

// Template sidebar (dashboard_sunext_dark_futuristic_*.html lines 6082-6153)
// rendered with the exact template markup. Nav items are Next <Link>s; each
// carries the `.nav-active-dot` span the template's "Liquid Metal" script
// appends at runtime.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Folder,
  House,
  Settings,
  SquareCheckBig,
  Users,
} from "lucide-react";

interface NavEntry {
  href: string;
  label: string;
  icon: ComponentType;
  badgeKey?: "notifications";
}

const NAV: NavEntry[] = [
  { href: "/", label: "Tổng quan", icon: House },
  { href: "/tasks", label: "Công việc", icon: SquareCheckBig },
  { href: "/projects", label: "Dự án", icon: Folder },
  { href: "/team", label: "Nhân viên", icon: Users },
  { href: "/reports", label: "Báo cáo", icon: ChartNoAxesColumnIncreasing },
  { href: "/calendar", label: "Lịch", icon: CalendarDays },
  { href: "/notifications", label: "Thông báo", icon: Bell, badgeKey: "notifications" },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

interface SxSidebarProps {
  open: boolean;
  unreadNotifications: number;
  onNavigate: () => void;
}

export function SxSidebar({ open, unreadNotifications, onNavigate }: SxSidebarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className={open ? "sidebar open" : "sidebar"} id="sidebar">
      <div className="brand">
        <div className="brand-logo" aria-label="SUNEXT">
          SUNEXT
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {NAV.map(({ href, label, icon: Icon, badgeKey }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={active ? "nav-item active" : "nav-item"}
              data-page={label}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <Icon />
              <span>{label}</span>
              {badgeKey === "notifications" && unreadNotifications > 0 && (
                <span className="nav-badge">{unreadNotifications}</span>
              )}
              <span className="nav-active-dot" />
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-team">
          <div className="sidebar-team-title">
            <span className="online" />
            Hệ thống hoạt động
          </div>
          <small>Đồng bộ dữ liệu realtime đang hoạt động bình thường.</small>
        </div>
      </div>
    </aside>
  );
}
