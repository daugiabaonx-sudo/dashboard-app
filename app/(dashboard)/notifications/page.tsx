// "Thông báo" — SUNEXT template notification list
// (sidebar.js#buildNotificationsView). Microsoft Planner has no
// notifications feed, so this lists whatever the Planner dataset carries
// (currently none).

import type { Metadata } from "next";
import { SxNotificationsView } from "@/components/sunext/sx-notifications-view";
import { getSxViewDataset } from "@/lib/sx-view-dataset";

export const metadata: Metadata = { title: "Thông báo · SUNEXT Dashboard" };

export default async function NotificationsPage() {
  const dataset = await getSxViewDataset();
  return <SxNotificationsView notifications={dataset.notifications} />;
}