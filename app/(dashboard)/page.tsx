// "Tổng quan" — SUNEXT Dashboard V2 template (Dashboard Sunext V2/index.html),
// rendered with Microsoft Planner data. See components/v2/v2-page.tsx.

import type { Metadata } from "next";
import { V2Page } from "@/components/v2/v2-page";

export const metadata: Metadata = {
  title: "SUNEXT Dashboard",
  description: "SUNEXT Team Management Dashboard – Indigo Care",
};

export default function DashboardPage() {
  return <V2Page view="overview" />;
}
