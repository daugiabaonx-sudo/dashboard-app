import type { ReactNode } from "react";

interface WelcomeBannerProps {
  greeting: string;
  name: string;
  subtitle: string;
  date: string;
  motivational: string;
  filters?: ReactNode;
}

export function WelcomeBanner({
  greeting,
  name,
  subtitle,
  date,
  motivational,
  filters,
}: WelcomeBannerProps) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl space-y-3">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium">{date}</span>
          <span aria-hidden className="mx-2 text-border">|</span>
          <span>{motivational}</span>
        </p>
        <h1 className="font-display text-[36px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-[44px]">
          {greeting}, {name} <span aria-hidden>👋</span>
        </h1>
        <p className="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {filters && (
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {filters}
        </div>
      )}
    </header>
  );
}