// Home page — switcher between v1 and v2.
// Set `NEXT_PUBLIC_DASHBOARD_V2=1` to opt into the v2 composition under
// `app/(dashboard)/v2/page.tsx`. The v1 render is kept inline so the
// default deploy stays stable while v2 lands.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiStripTile } from "@/components/dashboard/kpi-tile";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { BlockersTable } from "@/components/dashboard/blockers-table";
import { FeaturedTasksTable } from "@/components/dashboard/featured-tasks-table";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { FilterChip } from "@/components/dashboard/filter-chip";
import {
  getBlockers,
  getFeaturedTasks,
  getKpiStrip,
  getStatusDonut,
} from "@/lib/data";
import {
  DEFAULT_LOCALE,
  isLocale,
  makeTranslator,
  type Locale,
} from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import PageV2 from "./v2/page";

const TODAY = new Date();

const KPI_LABEL_KEY: Record<string, string> = {
  total: "total",
  completed: "completed",
  inProgress: "inProgress",
  overdue: "overdue",
  blocked: "blocked",
};

const KPI_DELTA_KEY: Record<string, string> = {
  total: "vsLastMonth",
  completed: "thisWeek",
  inProgress: "vsYesterday",
  overdue: "needsAttention",
  blocked: "next7Days",
};

const KPI_HREF: Record<string, string> = {
  total: "/projects",
  completed: "/tasks?status=done",
  inProgress: "/tasks?status=in_progress",
  overdue: "/tasks?filter=overdue",
  blocked: "/tasks?filter=blocked",
};

function PageV1() {
  const locale: Locale = DEFAULT_LOCALE;
  if (!isLocale(locale)) throw new Error("Invalid locale");
  const { t } = makeTranslator(locale);

  const kpis = getKpiStrip();
  const { slices, total } = getStatusDonut();
  const blockers = getBlockers();
  const featured = getFeaturedTasks(5);

  const filterNodes = (
    <>
      <FilterChip icon="calendar" label={t("dashboard.filters.thisWeek")} />
      <FilterChip icon="users" label={t("dashboard.filters.allTeams")} />
      <FilterChip icon="sliders" label={t("dashboard.filters.allProjects")} />
    </>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <WelcomeBanner
        greeting={t("dashboard.welcome.hello")}
        name={t("dashboard.greeting.name")}
        subtitle={t("dashboard.welcome.subtitle")}
        date={formatDate(TODAY.toISOString(), "EEEE, d 'Tháng' M, yyyy")}
        motivational={t("dashboard.welcome.motivational")}
        filters={filterNodes}
      />

      {/* KPI strip — 5 tiles across on desktop, 2-col on mobile */}
      <section
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
        aria-label={t("common.viewAll")}
      >
        {kpis.map((k, i) => (
          <KpiStripTile
            key={k.id}
            label={t(`dashboard.kpi.${KPI_LABEL_KEY[k.id] ?? k.id}`)}
            value={k.value}
            delta={k.delta}
            deltaLabel={t(`dashboard.kpi.${KPI_DELTA_KEY[k.id] ?? "thisWeek"}`)}
            trend={k.trend}
            intent={k.intent}
            sparkline={k.sparkline}
            href={KPI_HREF[k.id]}
            delay={i}
          />
        ))}
      </section>

      {/* Section 1 — Featured tasks (wide) + Status donut (small) */}
      <section className="grid gap-3 lg:grid-cols-12">
        <Card
          className="lg:col-span-8 animate-fade-up opacity-0"
          style={{ animationDelay: "120ms" }}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl font-normal tracking-tight">
                  {t("dashboard.featured.title")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("dashboard.featured.subtitle")}
                </CardDescription>
              </div>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {t("dashboard.featured.viewAll")}{" "}
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <FeaturedTasksTable
              rows={featured}
              emptyMessage={t("dashboard.featured.empty")}
            />
          </CardContent>
        </Card>

        <Card
          className="lg:col-span-4 animate-fade-up opacity-0"
          style={{ animationDelay: "160ms" }}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl font-normal tracking-tight">
                  {t("dashboard.status.title")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("dashboard.status.subtitle")}
                </CardDescription>
              </div>
              <Badge tone="neutral" size="sm">
                {t("dashboard.filters.allProjects")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <StatusDonut
              slices={slices}
              total={total}
              withAmounts="both"
              centerLabel={t("dashboard.status.total")}
            />
          </CardContent>
        </Card>
      </section>

      {/* Section 2 — Blockers full width */}
      <section>
        <Card
          className="animate-fade-up opacity-0"
          style={{ animationDelay: "200ms" }}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl font-normal tracking-tight">
                  {t("dashboard.blockers.title")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("dashboard.blockers.subtitle")}
                </CardDescription>
              </div>
              <Link
                href="/tasks?filter=blocked"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {t("dashboard.blockers.viewAll")}{" "}
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <BlockersTable
              rows={blockers}
              emptyMessage={t("dashboard.blockers.empty")}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const v2 = process.env.NEXT_PUBLIC_DASHBOARD_V2 === "1";
  return v2 ? <PageV2 /> : <PageV1 />;
}