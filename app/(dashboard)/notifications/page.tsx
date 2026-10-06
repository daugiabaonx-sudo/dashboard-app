// "Thông báo" — SUNEXT template notification list
// (sidebar.js#buildNotificationsView).

import type { Metadata } from "next";
import { SxNotificationsView } from "@/components/sunext/sx-notifications-view";
import { getSxPageData } from "@/lib/sx-page-data";

export const metadata: Metadata = { title: "Thông báo · SUNEXT Dashboard" };

export default function NotificationsPage() {
  const { dataset } = getSxPageData();
  return <SxNotificationsView notifications={dataset.notifications} />;
}