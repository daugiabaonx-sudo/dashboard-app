// v2 welcome banner — left = greeting + name, right = date + motivational line.

interface WelcomeBannerLabels {
  hello: string;
  subtitle: string;
  motivational: string;
}

interface WelcomeBannerProps {
  name: string;
  date: string;
  labels: WelcomeBannerLabels;
}

export function WelcomeBanner({ name, date, labels }: WelcomeBannerProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl space-y-2">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium">{date}</span>
        </p>
        <h1 className="font-display text-[36px] font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-[44px]">
          {labels.hello}, <span className="text-brand">{name}</span>
        </h1>
        <p className="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          {labels.subtitle}
        </p>
      </div>
      <p className="text-[13px] italic text-muted-foreground lg:text-right">
        {labels.motivational}
      </p>
    </header>
  );
}