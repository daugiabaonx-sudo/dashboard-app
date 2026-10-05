"use client";

// v2 top bar — sticky search, 3 filter chips, locale switcher, theme toggle,
// notification bell, user chip. Mirrors the existing header behavior but
// restyled for the v2 layout grid.

import { Moon, Plus, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/dashboard/filter-chip";
import { LocaleSwitcher } from "@/components/dashboard-v2/locale-switcher";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { SignOutMenu } from "@/components/layout/sign-out-menu";
import type { DashboardProfile } from "@/lib/dashboard-data";
import type { ReactNode } from "react";

interface TopBarLabels {
  searchPlaceholder: string;
  filters: string;
  thisWeek: string;
  allTeams: string;
  allProjects: string;
  language: string;
  languageEn: string;
  languageVi: string;
  toggleTheme: string;
  roleLabel: string;
}

interface TopBarProps {
  labels: TopBarLabels;
  profile: DashboardProfile;
  newTask?: ReactNode;
}

export function TopBar({ labels, profile, newTask }: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:gap-3 lg:px-8">
      <div className="relative min-w-0 flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={labels.searchPlaceholder}
          className={cn(
            "h-10 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-12 text-sm",
            "placeholder:text-muted-foreground/70",
            "focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
          )}
          aria-label={labels.searchPlaceholder}
        />
        <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground md:inline">
          ⌘ K
        </kbd>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <FilterChip icon="calendar" label={labels.thisWeek} />
        <FilterChip icon="users" label={labels.allTeams} />
        <FilterChip icon="sliders" label={labels.allProjects} />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        aria-label={labels.filters}
      >
        {labels.filters}
      </Button>

      <div className="flex shrink-0 items-center gap-1">
        {newTask && <span className="hidden sm:inline-flex">{newTask}</span>}

        <Button
          variant="ghost"
          size="icon"
          aria-label={labels.toggleTheme}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="block dark:hidden" />
        </Button>

        <LocaleSwitcher
          labels={{
            trigger: labels.language,
            language: labels.language,
            languageEn: labels.languageEn,
            languageVi: labels.languageVi,
          }}
        />

        <NotificationsBell />

        <div className="ml-1 flex h-9 items-center gap-2 border-l border-border pl-2">
          <Avatar color={profile.avatarColor} className="size-7">
            <span>{profile.initials}</span>
          </Avatar>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-xs font-medium">{profile.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {labels.roleLabel}
            </span>
          </div>
          <SignOutMenu />
        </div>
      </div>
    </header>
  );
}