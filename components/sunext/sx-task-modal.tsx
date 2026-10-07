"use client";

// Task detail modal (html lines 6808-6928, tasks.js). Always mounted so the
// template's open/close CSS transition plays; `.open` toggles visibility.

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import {
  formatDeadline,
  type SxBlocker,
  type SxEmployee,
  type SxPriority,
  type SxProject,
  type SxStatus,
  type SxTask,
  type SxTaskEdit,
} from "@/lib/sx-dashboard";

export type { SxTaskEdit };

interface Props {
  task: SxTask | null;
  employees: SxEmployee[];
  projects: SxProject[];
  blockers: SxBlocker[];
  onClose: () => void;
  onSave: (id: string, edit: SxTaskEdit) => void;
  /** True while the save is in flight (disables the button). */
  saving?: boolean;
  /** False for Microsoft Planner tasks — their notes are not synced. */
  notesEnabled?: boolean;
}

export function SxTaskModal({
  task,
  employees,
  projects,
  blockers,
  onClose,
  onSave,
  saving = false,
  notesEnabled = true,
}: Props) {
  const [form, setForm] = useState<SxTaskEdit>({ status: "in_progress", priority: "medium", progress: 0, notes: "", deadline: "" });
  const [fillWidth, setFillWidth] = useState(0);
  const open = task !== null;

  useEffect(() => {
    if (!task) return;
    setForm({ status: task.status, priority: task.priority, progress: task.progress, notes: task.notes, deadline: task.deadline });
    setFillWidth(0);
    const raf = requestAnimationFrame(() => setFillWidth(task.progress));
    return () => cancelAnimationFrame(raf);
  }, [task]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const emp = task ? employees.find((e) => e.id === task.employeeId) : undefined;
  const proj = task ? projects.find((p) => p.id === task.projectId) : undefined;
  const taskBlockers = task ? blockers.filter((b) => b.taskId === task.id) : [];

  function setProgress(value: number) {
    setForm((f) => ({ ...f, progress: value }));
    setFillWidth(value);
  }

  return (
    <div
      className={open ? "modal-backdrop open" : "modal-backdrop"}
      id="taskModal"
      aria-hidden={!open}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalId">
        <div className="modal-accent" />

        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">Chi tiết công việc</div>
            <h2 id="modalId">{task?.id ?? "Task"}</h2>
          </div>
          <button className="icon-button" id="closeModalButton" aria-label="Đóng" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-task-title" id="modalTaskTitle">
            {task?.title}
          </div>

          <div className="detail-grid">
            <DetailCard label="Nhân viên" id="modalEmployee" value={emp ? `${emp.name} (${emp.role})` : task?.employeeId ?? ""} />
            <DetailCard label="Dự án" id="modalProject" value={proj ? proj.name : task?.projectId ?? ""} />
            <DetailCard label="Team" id="modalTeam" value={emp ? emp.team : "—"} />
            <DetailCard label="Deadline" id="modalDeadline" value={task ? formatDeadline(task.deadline) : ""} />
          </div>

          <div id="modalBlockerInfo" style={{ display: taskBlockers.length ? "block" : "none" }}>
            {taskBlockers.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,97,112,.09)",
                  border: "1px solid rgba(255,97,112,.14)",
                  borderRadius: "8px",
                  marginTop: "6px",
                  fontSize: "10px",
                  color: "#ff8792",
                }}
              >
                <strong>⚠ Điểm nghẽn:</strong> {b.issue} <span style={{ color: "var(--sx-text-muted)" }}>({b.daysBlocked} ngày)</span>
              </div>
            ))}
          </div>

          <div className="modal-progress">
            <div className="modal-progress-title">
              <span>Tiến độ công việc</span>
              <strong id="modalProgressText">{form.progress}%</strong>
            </div>
            <div className="modal-progress-track">
              <div className="modal-progress-fill" id="modalProgressFill" style={{ width: `${fillWidth}%` }} />
            </div>
            <input
              type="range"
              id="modalProgressSlider"
              className="modal-slider"
              min={0}
              max={100}
              step={1}
              value={form.progress}
              aria-label="Chỉnh tiến độ"
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </div>

          <div className="modal-edit-section">
            <div className="modal-edit-row">
              <div>
                <label htmlFor="modalStatusSelect">Trạng thái</label>
                <select id="modalStatusSelect" className="modal-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SxStatus }))}>
                  <option value="not_started">Chưa bắt đầu</option>
                  <option value="in_progress">Đang làm</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="overdue">Trễ hạn</option>
                  <option value="blocked">Bị chặn</option>
                </select>
              </div>
              <div>
                <label htmlFor="modalPrioritySelect">Ưu tiên</label>
                <select id="modalPrioritySelect" className="modal-select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as SxPriority }))}>
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="modalDeadlineInput">Deadline</label>
              <input
                type="date"
                id="modalDeadlineInput"
                className="modal-select"
                value={form.deadline ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            {notesEnabled ? (
              <div>
                <label htmlFor="modalNotes">Ghi chú</label>
                <textarea id="modalNotes" className="modal-textarea" placeholder="Thêm ghi chú..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 10, color: "var(--sx-text-muted)" }}>
                Thay đổi sẽ được lưu thẳng vào Microsoft Planner.
              </p>
            )}

            <button
              id="modalSaveBtn"
              className="modal-save-btn"
              disabled={saving}
              aria-busy={saving}
              style={saving ? { opacity: 0.6, cursor: "wait" } : undefined}
              onClick={() => task && !saving && onSave(task.id, form)}
            >
              <Save />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, id, value }: { label: string; id: string; value: string }) {
  return (
    <div className="detail-card">
      <div className="detail-label">{label}</div>
      <div className="detail-value" id={id}>
        {value}
      </div>
    </div>
  );
}
