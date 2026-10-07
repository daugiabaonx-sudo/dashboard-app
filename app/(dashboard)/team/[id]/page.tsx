// Legacy member detail page. It read the in-app demo data; the dashboard now
// shows Microsoft Planner data only (members have no detail page), so old
// links go to the team list.

import { redirect } from "next/navigation";

export default function TeamMemberPage(): never {
  redirect("/team");
}
