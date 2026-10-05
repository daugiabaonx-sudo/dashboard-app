"use client";

// Bridge component that owns the task-modal provider + the clickable
// AnimatedTable. The page (server) passes `rows` + `tableLabels` +
// `modalLabels`; the bridge wires row clicks to `useTaskModal().open`.

import { TaskModal, type TaskModalLabels } from "@/components/dashboard-v2/task-modal/task-modal";
import { TaskModalProvider, useTaskModal } from "@/hooks/use-task-modal";
import { AnimatedTable, type AnimatedTableLabels } from "@/components/dashboard-v2/tasks/animated-table";
import type { DashboardTaskRow } from "@/lib/tasks-types";

interface TasksPageBridgeProps {
  rows: DashboardTaskRow[];
  tableLabels: AnimatedTableLabels;
  modalLabels: TaskModalLabels;
  focusId?: string;
}

export function TasksPageBridge({ rows, tableLabels, modalLabels, focusId }: TasksPageBridgeProps) {
  return (
    <TaskModalProvider>
      <TableWithClicks rows={rows} labels={tableLabels} focusId={focusId} />
      <TaskModal rows={rows} labels={modalLabels} />
    </TaskModalProvider>
  );
}

function TableWithClicks({ rows, labels, focusId }: { rows: DashboardTaskRow[]; labels: AnimatedTableLabels; focusId?: string }) {
  const { open } = useTaskModal();
  return <AnimatedTable rows={rows} labels={labels} focusId={focusId} onRowClick={(id) => open(id)} />;
}