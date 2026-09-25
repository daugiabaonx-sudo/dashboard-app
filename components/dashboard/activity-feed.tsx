import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
  UserPlus,
  ArrowRightLeft,
  FolderPlus,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { activities, findUser } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  task_created: Plus,
  task_completed: CheckCircle2,
  task_assigned: UserPlus,
  comment_added: MessageSquare,
  project_created: FolderPlus,
  status_changed: ArrowRightLeft,
  deadline_missed: AlertCircle,
};

const TONE: Record<string, string> = {
  task_completed: "text-status-good bg-status-good/10",
  task_assigned: "text-primary bg-primary/10",
  comment_added: "text-muted-foreground bg-secondary",
  project_created: "text-primary bg-primary/10",
  status_changed: "text-status-warning bg-status-warning/10",
  deadline_missed: "text-status-critical bg-status-critical/10",
  task_created: "text-muted-foreground bg-secondary",
};

export function ActivityFeed() {
  return (
    <ul className="space-y-4">
      {activities.map((a) => {
        const actor = findUser(a.actorId);
        const Icon = ICONS[a.type] ?? Plus;
        return (
          <li key={a.id} className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                TONE[a.type],
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <span className="font-medium">
                  {actor?.name ?? "Someone"}
                </span>{" "}
                <span className="text-muted-foreground">{a.message}</span>
              </p>
              <Link
                href={a.targetType === "task" ? "/tasks" : "/projects"}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {a.targetTitle}
                <span className="text-muted-foreground">· {formatRelative(a.createdAt)}</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
