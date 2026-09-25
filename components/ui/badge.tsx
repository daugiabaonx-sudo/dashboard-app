import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors tabular-nums tracking-tight",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/10 text-primary",
        good: "bg-status-good/10 text-status-good",
        warning: "bg-status-warning/12 text-status-warning",
        serious: "bg-status-serious/10 text-status-serious",
        critical: "bg-status-critical/10 text-status-critical",
        outline: "border border-border text-foreground",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0",
        md: "text-[11px] px-2 py-0.5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

export function Dot({ tone = "neutral" }: { tone?: "neutral" | "good" | "warning" | "serious" | "critical" }) {
  const map = {
    neutral: "bg-muted-foreground",
    good: "bg-status-good",
    warning: "bg-status-warning",
    serious: "bg-status-serious",
    critical: "bg-status-critical",
  } as const;
  return <span className={cn("size-1.5 shrink-0 rounded-full", map[tone])} aria-hidden />;
}
