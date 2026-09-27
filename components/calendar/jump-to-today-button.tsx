// components/calendar/jump-to-today-button.tsx
// Client-only anchor that smooth-scrolls to today's calendar cell.
"use client";

import { Button } from "@/components/ui/button";

interface Props {
  targetId: string;
  todayLabel: string;
}

export function JumpToTodayButton({ targetId, todayLabel }: Props) {
  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
    >
      <a
        href={`#${targetId}`}
        aria-label={`Jump to today, ${todayLabel}`}
        onClick={onClick}
      >
        Today: {todayLabel}
      </a>
    </Button>
  );
}
