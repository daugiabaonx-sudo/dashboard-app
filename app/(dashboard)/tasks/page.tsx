import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskRow } from "@/components/tasks/task-row";
import { TasksToolbar } from "@/components/tasks/tasks-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { tasks, projects } from "@/lib/data";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

interface TasksPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const view = params.view === "board" ? "board" : "list";
  const open = tasks.filter((t) => t.status !== "done").length;
  const overdue = tasks.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < new Date(),
  ).length;
  const blocked = tasks.filter((t) => t.blocked).length;

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow={`${open} open · ${overdue} overdue · ${blocked} blocked`}
        title={<>What needs to <span className="italic text-primary">ship</span>.</>}
        description="All open work, sorted by urgency. Switch the view to see the same work as a Kanban spread."
        actions={null}
      />

      <TasksToolbar view={view} projects={projectOptions} />

      {view === "board" ? (
        <KanbanBoard initialTasks={tasks} workspaceId={DEFAULT_WORKSPACE_ID} />
      ) : (
        <Card className="animate-fade-up opacity-0" style={{ animationDelay: "80ms" }}>
          <CardContent className="p-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <span className="w-4" />
              <span>Task</span>
              <span className="hidden md:block">Status / Priority</span>
              <span className="hidden sm:block">Due</span>
              <span>Assignee</span>
              <span className="w-4" />
            </div>
            <div className="divide-y divide-border">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
