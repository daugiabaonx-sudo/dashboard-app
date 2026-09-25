import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Avatar = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement> & { color?: string }
>(({ className, color, style, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold",
      className,
    )}
    style={style}
    {...props}
  >
    <AvatarPrimitive.Root className="size-full">
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center"
        style={{ background: color ?? "var(--muted)", color: "white" }}
      />
    </AvatarPrimitive.Root>
  </span>
));
Avatar.displayName = "Avatar";

export function AvatarFallbackText({ initials }: { initials: string }) {
  return <span className="drop-shadow-sm">{initials}</span>;
}
