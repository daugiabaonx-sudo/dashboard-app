// Home page — v2 composition. Owns its own sidebar + top bar + content
// shell; the shared (dashboard) layout skips the v1 chrome.

import { cookies } from "next/headers";
import { Sidebar } from "@/components/dashboard-v2/sidebar";
import { TopBar } from "@/components/dashboard-v2/top-bar";
import { KpiStrip } from "@/components/dashboard-v2/kpi-strip";
import { FeaturedTasks } from "@/components/dashboard-v2/featured-tasks";
import { StatusDonutCard } from "@/components/dashboard-v2/status-donut-card";
import { BlockersTable } from "@/components/dashboard-v2/blockers-table";
import { ProjectHealthCard } from "@/components/dashboard-v2/project-health-card";
import { WorkloadTeam } from "@/components/dashboard-v2/workload-team";
import { GreetingTypewriter } from "@/components/dashboard-v2/greeting-typewriter";
import { SubtitleMorph } from "@/components/dashboard-v2/subtitle-morph";
import { HighlightText } from "@/components/dashboard-v2/highlight-text";
import { ShutterText } from "@/components/dashboard-v2/shutter-text";
import { getDashboardSummary, localizeKpis } from "@/lib/dashboard-data";
import {
  LOCALE_COOKIE_NAME,
  getRequestLocale,
  makeTranslator,
} from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const summary = getDashboardSummary({ userId: "u1", role: "admin" });
  const cookieStore = await cookies();
  const locale = getRequestLocale(() => cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const { t, tArray } = makeTranslator(locale);

  const typewriterWords = tArray("greeting.typewriter.words");
  const morphLines = tArray("greeting.morph.lines");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-60 lg:block">
        <Sidebar
          labels={{
            overview: t("sidebar.overview"),
            tasks: t("sidebar.tasks"),
            projects: t("sidebar.projects"),
            employees: t("sidebar.employees"),
            reports: t("sidebar.reports"),
            calendar: t("sidebar.calendar"),
            notifications: t("sidebar.notifications"),
            settings: t("sidebar.settings"),
            statusOk: t("sidebar.statusOk"),
            statusHint: t("sidebar.statusHint"),
          }}
        />
      </div>
      <div className="lg:pl-60">
        <TopBar
          profile={summary.profile}
          labels={{
            searchPlaceholder: t("topBar.searchPlaceholder"),
            filters: t("topBar.filters"),
            thisWeek: t("dashboard.filters.thisWeek"),
            allTeams: t("dashboard.filters.allTeams"),
            allProjects: t("dashboard.filters.allProjects"),
            language: t("topBar.language"),
            languageEn: t("topBar.languageEn"),
            languageVi: t("topBar.languageVi"),
            toggleTheme: t("topBar.toggleTheme"),
            roleLabel:
              summary.profile.role === "admin"
                ? t("profile.admin")
                : t("profile.member"),
          }}
        />
        <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-8 pt-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-[12px] text-muted-foreground">
                <span className="font-medium">{formatDate(new Date().toISOString(), "EEEE, MMM d")}</span>
              </p>
              <h1 className="font-display text-[36px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-[44px]">
                <GreetingTypewriter
                  prefix={`${t("dashboard.welcome.hello")} `}
                  words={typewriterWords}
                />
              </h1>
              <p className="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
                <SubtitleMorph lines={morphLines} />
              </p>
            </div>
            <p className="text-[13px] italic text-muted-foreground lg:text-right">
              <HighlightText>{t("dashboard.welcome.motivational")}</HighlightText>
            </p>
          </header>

          <KpiStrip
            kpis={localizeKpis(summary.kpis, t)}
            ariaLabel={t("dashboard.kpi.ariaLabel")}
          />
          <section className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <FeaturedTasks
                rows={summary.featured}
                labels={{
                  title: t("dashboard.featured.title"),
                  subtitle: t("dashboard.featured.subtitle"),
                  viewAll: t("dashboard.featured.viewAll"),
                  employee: t("table.employee"),
                  project: t("table.project"),
                  task: t("table.task"),
                  priority: t("table.priority"),
                  progress: t("table.progress"),
                  deadline: t("table.deadline"),
                  empty: t("dashboard.featured.empty"),
                  priorityHigh: t("priority.high"),
                  priorityMedium: t("priority.medium"),
                  priorityLow: t("priority.low"),
                  today: t("common.today"),
                  daysOverduePattern: t("common.daysOverduePattern"),
                  daysLeftPattern: t("common.daysLeftPattern"),
                }}
                titleSlot={
                  <ShutterText text={t("dashboard.featured.title")} />
                }
              />
            </div>
            <div className="space-y-3 lg:col-span-4">
              <StatusDonutCard
                donut={summary.statusDonut}
                labels={{
                  title: t("dashboard.status.title"),
                  subtitle: t("dashboard.status.subtitle"),
                  total: t("dashboard.status.total"),
                  done: t("dashboard.status.done"),
                  inReview: t("dashboard.status.inReview"),
                  inProgress: t("dashboard.status.inProgress"),
                  todo: t("dashboard.status.todo"),
                  backlog: t("dashboard.status.backlog"),
                }}
              />
              <ProjectHealthCard
                labels={{
                  title: t("healthMark.title"),
                  subtitle: t("healthMark.subtitle"),
                  onTrack: t("healthMark.onTrack"),
                  atRisk: t("healthMark.atRisk"),
                  blocked: t("healthMark.blocked"),
                  tasks: t("healthMark.tasks"),
                  done: t("healthMark.done"),
                }}
              />
            </div>
          </section>
          <section className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <BlockersTable
                rows={summary.blockers}
                labels={{
                  title: t("dashboard.blockers.title"),
                  subtitle: t("dashboard.blockers.subtitle"),
                  viewAll: t("dashboard.blockers.viewAll"),
                  empty: t("dashboard.blockers.empty"),
                  severity: t("dashboard.blockers.severity"),
                  days: t("table.days"),
                  priorityHigh: t("priority.high"),
                  priorityMedium: t("priority.medium"),
                  priorityLow: t("priority.low"),
                  daysStuckPattern: t("common.daysStuckPattern"),
                }}
              />
            </div>
            <div className="lg:col-span-4">
              <WorkloadTeam
                labels={{
                  title: t("workload.title"),
                  subtitle: t("workload.subtitle"),
                  activeTasks: t("workload.activeTasks"),
                  utilization: t("workload.utilization"),
                }}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}