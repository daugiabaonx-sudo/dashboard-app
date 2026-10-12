// The V2 dashboard template has three tabs (Tổng quan, Dự án & Công việc,
// Cài đặt); this legacy route now redirects to the matching tab.

import { redirect } from "next/navigation";

export default function LegacyRedirect() {
  redirect("/");
}
