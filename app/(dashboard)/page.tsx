// Home page — v2 composition. Owns its own sidebar + top bar + content
// shell; the shared (dashboard) layout skips the v1 chrome.

import { Sidebar } from "@/components/dashboard-v2/sidebar";
import { TopBar } from "@/components/dashboard-v2/top-bar";
import { WelcomeBanner } from "@/components/dashboard-v2/welcome-banner";
import { KpiStrip } from "@/components/dashboard-v2/kpi-strip";
import { FeaturedTasks } from "@/components/dashboard-v2/featured-tasks";
import { StatusDonutCard } from "@/components/dashboard-v2/status-donut-card";
import { BlockersTable } from "@/components/dashboard-v2/blockers-table";
import { getDashboardSummary } from "@/lib/dashboard-data";
import { DEFAULT_LOCALE, makeTranslator } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export default function DashboardPage() {
  const summary = getDashboardSummary({ userId: "u1", role: "admin" });
  const { t } = makeTranslator(DEFAULT_LOCALE);

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
            statusOk: "All systems operational",
            statusHint: "Realtime sync active · last incident 14d ago",
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
          }}
        />
        <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-8 pt-6 lg:px-8">
          <WelcomeBanner
            name={summary.profile.name}
            date={formatDate(new Date().toISOString(), "EEEE, MMM d")}
            labels={{
              hello: t("dashboard.welcome.hello"),
              subtitle: t("dashboard.welcome.subtitle"),
              motivational: t("dashboard.welcome.motivational"),
            }}
          />
          <KpiStrip kpis={summary.kpis} />
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
                }}
              />
            </div>
            <div className="lg:col-span-4">
              <StatusDonutCard
                donut={summary.statusDonut}
                labels={{
                  title: t("dashboard.status.title"),
                  subtitle: t("dashboard.status.subtitle"),
                  total: t("dashboard.status.total"),
                }}
              />
            </div>
          </section>
          <BlockersTable
            rows={summary.blockers}
            labels={{
              title: t("dashboard.blockers.title"),
              subtitle: t("dashboard.blockers.subtitle"),
              viewAll: t("dashboard.blockers.viewAll"),
              empty: t("dashboard.blockers.empty"),
              severity: t("priority.high").replace(/^./, (c) => c.toLowerCase()),
              days: t("table.days"),
            }}
          />
        </main>
      </div>
    </div>
  );
}
