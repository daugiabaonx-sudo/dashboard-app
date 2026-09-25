import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

export function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <Skeleton className="size-9 rounded-md" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="mt-3">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function RowSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
