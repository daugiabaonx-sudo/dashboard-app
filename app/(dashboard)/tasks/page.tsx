// v2 Tasks page — server composition that calls getDashboardTasks() and
// hands the result to the AnimatedTable client component. URL-as-state is
// read here and serialized into the `rows` prop; the client owns the
// interactive filter/sort/page state.

import { cookies } from "next/headers";
import { Sidebar } from "@/components/dashboard-v2/sidebar";
import { TopBar } from "@/components/dashboard-v2/top-bar";
import { ShutterText } from "@/components/dashboard-v2/shutter-text";
import { TasksPageBridge } from "@/components/dashboard-v2/task-modal/tasks-page-bridge";
import { getDashboardSummary, type DashboardFeaturedRow } from "@/lib/dashboard-data";
import { getDashboardTasks } from "@/lib/tasks-data";
import {
  LOCALE_COOKIE_NAME,
  getRequestLocale,
  makeTranslator,
} from "@/lib/i18n";
import { formatDate } from "@/lib/format";

interface TasksPageProps {
  searchParams: Promise<{ focus?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const focusId = typeof params.focus === "string" ? params.focus : undefined;
  const summary = getDashboardSummary({ userId: "u1", role: "admin" });
  const cookieStore = await cookies();
  const locale = getRequestLocale(() => cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const { t } = makeTranslator(locale);

  const rows = getDashboardTasks();

  const sidebarLabels = {
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
  };

  const topBarLabels = {
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
  };

  const tableLabels = {
    title: t("view.tasks.title"),
    search: t("table.search"),
    columns: t("table.columns"),
    showAll: t("table.showAll"),
    hideAll: t("table.hideAll"),
    rowsPerPage: t("table.rowsPerPage"),
    page: t("table.page"),
    of: t("table.of"),
    showing: t("table.showing"),
    noResults: t("table.noResults"),
    today: t("common.today"),
    daysOverduePattern: t("common.daysOverduePattern"),
    daysLeftPattern: t("common.daysLeftPattern"),
    openTask: t("table.openTask"),
    column: {
      task: t("table.task"),
      project: t("table.project"),
      status: t("table.status"),
      priority: t("table.priority"),
      assignee: t("table.assignee"),
      progress: t("table.progress"),
      deadline: t("table.deadline"),
    },
    statusLabels: {
      backlog: t("dashboard.tableStatus.backlog"),
      todo: t("dashboard.tableStatus.todo"),
      in_progress: t("dashboard.tableStatus.inProgress"),
      in_review: t("dashboard.tableStatus.inReview"),
      done: t("dashboard.tableStatus.done"),
    },
    priorityLabels: {
      low: t("priority.low"),
      medium: t("priority.medium"),
      high: t("priority.high"),
      urgent: t("priority.urgent"),
    },
    blockerTitle: t("modal.task.blockerTitle"),
    blockedBy: t("dashboard.blockers.blockedBy"),
  };

  const modalLabels = {
    title: t("modal.task.title"),
    status: t("modal.task.status"),
    priority: t("modal.task.priority"),
    progress: t("modal.task.progress"),
    notes: t("modal.task.notes"),
    save: t("modal.task.save"),
    cancel: t("modal.task.cancel"),
    saved: t("modal.task.saved"),
    savedHint: t("modal.task.savedHint"),
    statusLabels: tableLabels.statusLabels,
    priorityLabels: tableLabels.priorityLabels,
  };

  const dateLabel = formatDate(new Date().toISOString(), "EEEE, MMM d");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-60 lg:block">
        <Sidebar labels={sidebarLabels} />
      </div>
      <div className="lg:pl-60">
        <TopBar profile={summary.profile} labels={topBarLabels} />
        <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-8 pt-6 lg:px-8">
          <header className="flex flex-col gap-2">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-medium">{dateLabel}</span>
            </p>
            <h1 className="font-display text-[32px] font-normal leading-[1.05] tracking-[-0.02em] md:text-[40px]">
              <ShutterText text={t("view.tasks.title")} />
            </h1>
            <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {t("view.tasks.subtitle")}
            </p>
          </header>

          <TasksPageBridge
            rows={rows}
            tableLabels={tableLabels}
            modalLabels={modalLabels}
            focusId={focusId}
          />
        </main>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
