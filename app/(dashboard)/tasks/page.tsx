import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskRow } from "@/components/tasks/task-row";
import { TasksToolbar } from "@/components/tasks/tasks-toolbar";
import { tasks } from "@/lib/data";

interface TasksPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const view = params.view === "board" ? "board" : "list";

  return (
    <div className="space-y-6 animate-fade-in">
      <TasksToolbar view={view} />

      {view === "board" ? (
        <KanbanBoard />
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="px-3 py-2 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 border-b border-border text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="w-4" />
              <span>Task</span>
              <span className="hidden md:block">Status / Priority</span>
              <span className="hidden sm:block">Due</span>
              <span>Assignee</span>
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
