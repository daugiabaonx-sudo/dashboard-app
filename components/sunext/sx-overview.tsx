"use client";

// Overview page content — mirrors the template's `.content` section:
// hero → 5 KPI cards → dashboard-grid (attention 7col + health 5col,
// project 7col + blocker 5col) + task modal.
//
// Filters come from the shell topbar. Modal edits are kept client-side in
// localStorage via the shared task store (same as the template prototype).

import { useMemo, useState } from "react";
import { calcKpis, filterBlockers, filterTasks, type SxDataset } from "@/lib/sx-dashboard";
import { useSxShell } from "./sx-shell-context";
import { SxHero, SxStatsGrid } from "./sx-hero-stats";
import { SxAttentionCard } from "./sx-attention-card";
import { SxHealthCard } from "./sx-health-card";
import { SxProjectCard } from "./sx-project-card";
import { SxBlockerCard } from "./sx-blocker-card";
import { SxTaskModalHost, useSxTaskStore } from "./use-sx-task-store";

interface Props {
  dataset: SxDataset;
  profileName: string;
}

export function SxOverview({ dataset, profileName }: Props) {
  const { filters, showToast } = useSxShell();
  const store = useSxTaskStore(dataset);
  const [now] = useState(() => new Date());

  const ds = useMemo(
    () => ({ ...dataset, tasks: store.tasks, blockers: store.blockers }),
    [dataset, store.tasks, store.blockers],
  );
  const filteredTasks = useMemo(() => filterTasks(ds, filters, now), [ds, filters, now]);
  const filteredBlockers = useMemo(() => filterBlockers(ds, filters), [ds, filters]);
  const kpis = useMemo(() => calcKpis(filteredTasks), [filteredTasks]);

  return (
    <>
      <SxHero name={profileName} note={dataset.sourceNote} />
      <SxStatsGrid kpis={kpis} />

      <section className="dashboard-grid reveal delay-2">
        <SxAttentionCard tasks={filteredTasks} employees={dataset.employees} now={now} onOpenTask={store.openTask} />
        <SxHealthCard kpis={kpis} />
        <SxProjectCard rows={dataset.projectHealth} projects={dataset.projects} />
        <SxBlockerCard
          blockers={filteredBlockers}
          employees={dataset.employees}
          projects={dataset.projects}
          onViewAll={() => showToast("Đang hiển thị danh sách điểm nghẽn.")}
        />
      </section>

      <SxTaskModalHost dataset={dataset} store={store} />
    </>
  );
}
