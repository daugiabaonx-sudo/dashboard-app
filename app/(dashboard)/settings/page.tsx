// "Cài đặt" — SUNEXT template settings (sidebar.js#buildSettingsView):
// profile and system info.

import type { Metadata } from "next";
import { SxSettingsView } from "@/components/sunext/sx-settings-view";
import { requireUser } from "@/lib/auth/session";
import { isPlannerConfigured } from "@/lib/planner/config";
import { buildSxShell } from "@/lib/sx-shell-data";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = { title: "Cài đặt · SUNEXT Dashboard" };

export default async function SettingsPage() {
  const session = await requireUser();
  const dataset = await getSxViewDataset();
  const { profile } = buildSxShell(session, dataset);
  const configured = isPlannerConfigured();
  return (
    <SxSettingsView
      info={{
        name: profile.name,
        roleLabel: profile.roleLabel,
        email: session.email,
        mode: configured ? "Microsoft Planner" : "Chưa cấu hình Microsoft Planner",
        storage: configured
          ? `Microsoft Planner · ${dataset.projects.length} bảng, ${dataset.tasks.length} công việc`
          : "—",
      }}
    />
  );
}

export const dynamic = "force-dynamic";
