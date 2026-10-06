// "Cài đặt" — SUNEXT template settings (sidebar.js#buildSettingsView):
// reset demo data, profile, system info.

import type { Metadata } from "next";
import { SxSettingsView } from "@/components/sunext/sx-settings-view";
import { requireUser } from "@/lib/auth/session";
import { isMockMode } from "@/lib/supabase/env";
import { getSxPageData } from "@/lib/sx-page-data";

export const metadata: Metadata = { title: "Cài đặt · SUNEXT Dashboard" };

export default async function SettingsPage() {
  const session = await requireUser();
  const { shell } = getSxPageData(session);
  return (
    <SxSettingsView
      info={{
        name: shell.profile.name,
        roleLabel: shell.profile.roleLabel,
        email: session.email,
        mode: isMockMode ? "Dữ liệu demo (mock)" : "Supabase",
        storage: "localStorage (chỉnh sửa trên trình duyệt)",
      }}
    />
  );
}
