import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { TeamGrid } from "@/components/team/team-grid";
import { users, getTeamWorkload, tasks } from "@/lib/data";

export default function TeamPage() {
  // Eyebrow counts read from the static seed; the live grid refreshes via
  // /api/team + /api/stats/workload through TanStack Query inside TeamGrid.
  const workload = getTeamWorkload();
  const totalOpen = tasks.filter((t) => t.status !== "done").length;
  const overloaded = workload.filter((w) => w.utilization > 90).length;
  const departments = new Set(users.map((u) => u.department)).size;

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`${users.length} members · ${departments} departments`}
        title={<>The people doing the <span className="italic text-primary">work</span>.</>}
        description={`${totalOpen} open tasks, ${overloaded} at over capacity. Watch the bars on the right — anyone in critical needs relief.`}
        actions={
          <>
            <Button variant="outline" size="sm">
              Export roster
            </Button>
            <Button size="sm">
              <UserPlus className="size-3.5" />
              Invite member
            </Button>
          </>
        }
      />

      <TeamGrid initialUsers={users} />
    </div>
  );
}
