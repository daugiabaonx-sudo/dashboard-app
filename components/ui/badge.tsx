import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/12 text-primary",
        good: "bg-status-good/12 text-status-good",
        warning: "bg-status-warning/15 text-status-warning",
        serious: "bg-status-serious/12 text-status-serious",
        critical: "bg-status-critical/12 text-status-critical",
        outline: "border border-border text-foreground",
      },
      size: {
        sm: "text-[11px] px-1.5 py-0",
        md: "text-xs px-2 py-0.5",
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
