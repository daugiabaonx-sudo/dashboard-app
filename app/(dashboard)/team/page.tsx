// "Nhân viên" — SUNEXT template employee cards (sidebar.js#buildEmployeesView).
// Cards link to the member detail page.

import type { Metadata } from "next";
import { SxEmployeesView } from "@/components/sunext/sx-employees-view";
import { getSxPageData } from "@/lib/sx-page-data";

export const metadata: Metadata = { title: "Nhân viên · SUNEXT Dashboard" };

export default function TeamPage() {
  const { dataset } = getSxPageData();
  return <SxEmployeesView dataset={dataset} />;
}
