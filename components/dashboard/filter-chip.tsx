import {
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<FilterChipIcon, LucideIcon> = {
  calendar: Calendar,
  users: Users,
  sliders: SlidersHorizontal,
};

export type FilterChipIcon = "calendar" | "users" | "sliders";

interface FilterChipProps {
  icon: FilterChipIcon;
  label: string;
}

export function FilterChip({ icon, label }: FilterChipProps) {
  const Icon = ICONS[icon];
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-soft transition-colors hover:border-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <span>{label}</span>
      <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
    </button>
  );
}