// v2 KPI strip — five tiles across on desktop, two on mobile. Each tile
// gets a brand-gradient icon block before the label.

import { AlertOctagon, CheckCircle2, CircleDashed, Clock, ListTodo } from "lucide-react";
import { KpiStripTile } from "@/components/dashboard/kpi-tile";
import type { DashboardKpi } from "@/lib/dashboard-data";

const KPI_HREF: Record<DashboardKpi["id"], string> = {
  total: "/projects",
  completed: "/tasks?status=done",
  inProgress: "/tasks?status=in_progress",
  overdue: "/tasks?filter=overdue",
  blocked: "/tasks?filter=blocked",
};

const KPI_ICON: Record<DashboardKpi["id"], React.ReactNode> = {
  total: <ListTodo className="size-4 text-white" />,
  completed: <CheckCircle2 className="size-4 text-white" />,
  inProgress: <Clock className="size-4 text-white" />,
  overdue: <AlertOctagon className="size-4 text-white" />,
  blocked: <CircleDashed className="size-4 text-white" />,
};

interface KpiStripProps {
  kpis: DashboardKpi[];
}

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <section
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="Dashboard KPIs"
    >
      {kpis.map((k, i) => (
        <KpiStripTile
          key={k.id}
          label={k.label}
          value={k.value}
          delta={k.delta}
          deltaLabel={k.deltaLabel}
          trend={k.trend}
          intent={k.intent}
          sparkline={k.sparkline}
          iconBlock={KPI_ICON[k.id]}
          href={KPI_HREF[k.id]}
          delay={i}
        />
      ))}
    </section>
  );
}