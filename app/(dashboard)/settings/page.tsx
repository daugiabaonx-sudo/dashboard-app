// "Cài đặt" — SUNEXT template settings (sidebar.js#buildSettingsView):
// profile and system info.

import type { Metadata } from "next";
import { SxSettingsView } from "@/components/sunext/sx-settings-view";
import { getUserRole } from "@/lib/auth/role";
import { requireUser } from "@/lib/auth/session";
import { isPlannerConfigured } from "@/lib/planner/config";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = { title: "Cài đặt · SUNEXT Dashboard" };

export default async function SettingsPage() {
  const session = await requireUser();
  const [dataset, role] = await Promise.all([getSxViewDataset(), getUserRole(session.userId)]);
  const { profile, canEdit } = buildSxShell(session, dataset, role);
  const configured = isPlannerConfigured();
  return (
    <SxSettingsView
      info={{
        name: profile.name,
        roleLabel: `${profile.roleLabel} · ${canEdit ? "được sửa công việc" : "chỉ xem"}`,
        email: session.email,
        mode: configured ? "Microsoft Planner" : "Chưa cấu hình Microsoft Planner",
        storage: configured
          ? `Microsoft Planner · ${dataset.projects.length} bảng, ${dataset.tasks.length} công việc`
          : "—",
      }}
    />
  );
}
