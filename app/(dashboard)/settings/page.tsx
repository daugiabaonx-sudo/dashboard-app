// "Cài đặt" — V2 template placeholder tab ("sẽ được thiết kế ở giai đoạn tiếp theo").

import type { Metadata } from "next";
import { V2Page } from "@/components/v2/v2-page";

export const metadata: Metadata = { title: "Cài đặt · SUNEXT Dashboard" };

export default function SettingsPage() {
  return <V2Page view="settings" />;
}
