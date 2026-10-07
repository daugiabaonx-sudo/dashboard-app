// Legacy project detail page. It read the in-app demo data; the dashboard now
// shows Microsoft Planner data only and Planner plans open in Planner itself
// (see components/sunext/sx-projects-view.tsx), so old links go to the list.

import { redirect } from "next/navigation";

export default function ProjectDetailPage(): never {
  redirect("/projects");
}
