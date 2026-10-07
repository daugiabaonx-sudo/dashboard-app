"use client";

// "Công việc" view — port of sidebar.js#buildTasksView: full task table,
// row click opens the shared task modal. `focusId` (from ?focus=) opens a
// task directly, used by deep links from notifications / calendar.

import { useEffect } from "react";
import { formatDeadline, type SxDataset } from "@/lib/sx-dashboard";
import { STATUS_CONFIG } from "./sx-attention-card";
import { PRIORITY_CONFIG, SxPageHero, SxPageView, SxProgress } from "./sx-page-view";
import { SxTaskModalHost, useSxTaskStore } from "./use-sx-task-store";

export function SxTasksView({ dataset, focusId }: { dataset: SxDataset; focusId?: string }) {
  const store = useSxTaskStore(dataset);
  const { openTask } = store;
  const employees = new Map(dataset.employees.map((e) => [e.id, e]));
  const projects = new Map(dataset.projects.map((p) => [p.id, p]));

  useEffect(() => {
    if (focusId && dataset.tasks.some((t) => t.id === focusId)) openTask(focusId);
  }, [focusId, dataset.tasks, openTask]);

  return (
    <SxPageView>
      <SxPageHero
        title="Tất cả công việc"
        subtitle={
          dataset.sourceNote ??
          (store.isPlanner
            ? `${store.tasks.length} công việc từ Microsoft Planner · chỉnh sửa sẽ lưu thẳng vào Planner`
            : `${store.tasks.length} công việc trong hệ thống`)
        }
      />
      <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="table-wrap" style={{ overflow: "auto", flex: 1, padding: "0 17px 17px" }}>
          <table className="tasks-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Mã CV</th>
                <th>Nhân viên</th>
                <th>Dự án</th>
                <th>Tên công việc</th>
                <th>Ưu tiên</th>
                <th>Tiến độ</th>
                <th>Deadline</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {store.tasks.map((task) => {
                const emp = employees.get(task.employeeId);
                const proj = projects.get(task.projectId);
                const sc = STATUS_CONFIG[task.status];
                const pc = PRIORITY_CONFIG[task.priority];
                return (
                  <tr
                    key={task.id}
                    className="task-row"
                    data-task-id={task.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => openTask(task.id)}
                  >
                    <td style={{ color: "var(--sx-text-muted)", fontSize: 9 }}>{task.id}</td>
                    <td>
                      <div className="employee">
                        <span className={`avatar ${emp?.avatar ?? "avatar-1"}`}>{emp?.initials ?? "?"}</span>
                        <span>{emp?.name ?? task.employeeId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="project">
                        <span className="project-dot" style={{ background: proj?.color ?? "#7b2ff2" }} />
                        <span>{proj?.name ?? task.projectId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="task-title">{task.title}</div>
                    </td>
                    <td>
                      <span className={`priority ${pc.cls}`}>
                        <pc.Icon />
                        {pc.label}
                      </span>
                    </td>
                    <td>
                      <SxProgress value={task.progress} />
                    </td>
                    <td>{formatDeadline(task.deadline)}</td>
                    <td>
                      <span className={`status ${sc.cls}`}>{sc.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <SxTaskModalHost dataset={dataset} store={store} />
    </SxPageView>
  );
}
