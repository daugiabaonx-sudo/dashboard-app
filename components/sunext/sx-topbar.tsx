"use client";

// Template topbar (html lines 6167-6344): mobile menu, search, 3 filter
// selects, notification panel and profile menu — same markup and class
// names, wired to the shell's filter state and the app's sign-out route.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";
import type { SxNotification, SxPeriod } from "@/lib/sx-dashboard";
import type { SxToastType } from "./sx-shell-context";

export const PERIOD_OPTIONS: { label: string; value: SxPeriod }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Tuần này", value: "week" },
  { label: "Tháng này", value: "month" },
  { label: "Quý này", value: "quarter" },
  { label: "Năm nay", value: "year" },
];

export interface SxProfile {
  userId: string;
  name: string;
  initials: string;
  roleLabel: string;
}

interface SxTopbarProps {
  profile: SxProfile;
  notifications: SxNotification[];
  teams: string[];
  projects: string[];
  searchRef: RefObject<HTMLInputElement | null>;
  period: SxPeriod;
  team: string;
  project: string;
  menusOpenKey: number;
  onSearch: (value: string) => void;
  onPeriod: (value: SxPeriod) => void;
  onTeam: (value: string) => void;
  onProject: (value: string) => void;
  onOpenSidebar: () => void;
  showToast: (message: string, type?: SxToastType) => void;
}

export function SxTopbar(props: SxTopbarProps) {
  const { profile, notifications, teams, projects, searchRef, menusOpenKey } = props;
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const hasUnread = notifications.some((n) => !n.read);

  // Escape (handled by the shell) bumps menusOpenKey to close both menus.
  useEffect(() => {
    setNotifOpen(false);
    setProfileOpen(false);
  }, [menusOpenKey]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!notifRef.current?.contains(target)) setNotifOpen(false);
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function signOut() {
    try {
      const res = await csrfFetch("/api/auth/sign-out", { method: "POST" });
      if (!res.ok) {
        props.showToast("Đăng xuất thất bại. Vui lòng thử lại.", "error");
        return;
      }
      // Hard navigation so the proxy re-evaluates the cleared session cookie.
      window.location.assign("/login");
    } catch {
      props.showToast("Lỗi mạng. Vui lòng thử lại.", "error");
    }
  }

  function onProfileAction(action: "profile" | "settings" | "logout") {
    setProfileOpen(false);
    if (action === "logout") void signOut();
    else router.push(action === "profile" ? `/team/${profile.userId}` : "/settings");
  }

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu-button" id="mobileMenuButton" aria-label="Mở menu" onClick={props.onOpenSidebar}>
        <Menu />
      </button>

      <label className="search-box">
        <Search />
        <input
          ref={searchRef}
          type="search"
          id="searchInput"
          placeholder="Tìm kiếm công việc, nhân viên, dự án..."
          autoComplete="off"
          onChange={(e) => props.onSearch(e.target.value)}
        />
      </label>

      <div className="filter-control period-filter">
        <CalendarDays />
        <select
          id="periodFilter"
          aria-label="Thời gian"
          value={PERIOD_OPTIONS.find((o) => o.value === props.period)?.label}
          onChange={(e) => props.onPeriod(PERIOD_OPTIONS.find((o) => o.label === e.target.value)?.value ?? "all")}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-control team-filter">
        <Users />
        <select id="teamFilter" aria-label="Team" value={props.team} onChange={(e) => props.onTeam(e.target.value)}>
          <option value="all">Tất cả team</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-control project-filter">
        {/* The template's lucide@0.468 has no "funnel" icon, so this slot renders empty there. */}
        <i data-lucide="funnel" />
        <select id="projectFilter" aria-label="Dự án" value={props.project} onChange={(e) => props.onProject(e.target.value)}>
          <option value="all">Tất cả dự án</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="topbar-spacer" />

      <div className="notification-wrapper" ref={notifRef}>
        <button
          className="icon-button"
          id="notificationButton"
          aria-label="Thông báo"
          aria-expanded={notifOpen}
          onClick={() => {
            setNotifOpen((v) => !v);
            setProfileOpen(false);
          }}
        >
          <Bell />
          {hasUnread && <span className="notification-badge" />}
        </button>

        <div className={notifOpen ? "notification-panel open" : "notification-panel"} id="notificationPanel">
          <div className="notification-title">Thông báo mới</div>
          <div id="notifItems">
            {notifications.map((n) => (
              <div className="notification-item" key={n.id}>
                <span className="notification-dot" style={{ background: n.color, boxShadow: `0 0 10px ${n.color}88` }} />
                <div>
                  <strong>{n.title}</strong>
                  <small>{n.message}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="profile" ref={profileRef}>
        <button
          className="profile-button"
          id="profileButton"
          aria-expanded={profileOpen}
          onClick={() => {
            setProfileOpen((v) => !v);
            setNotifOpen(false);
          }}
        >
          <div className="profile-avatar">{profile.initials}</div>
          <div className="profile-info">
            <strong>{profile.name}</strong>
            <span>{profile.roleLabel}</span>
          </div>
          <ChevronDown />
        </button>

        <div className={profileOpen ? "profile-menu open" : "profile-menu"} id="profileMenu">
          <button onClick={() => onProfileAction("profile")}>
            <User />
            Hồ sơ cá nhân
          </button>
          <button onClick={() => onProfileAction("settings")}>
            <Settings />
            Cài đặt tài khoản
          </button>
          <button onClick={() => onProfileAction("logout")}>
            <LogOut />
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
