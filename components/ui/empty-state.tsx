import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-[13px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-status-critical/20 bg-status-critical/5 px-6 py-8 text-center">
      <h3 className="text-sm font-medium text-status-critical">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
