// app/(auth)/auth-form.tsx
// Shared form chrome: paper card, eyebrow, H1 (Instrument Serif).

import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ eyebrow, title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-6 shadow-soft">
          {children}
        </div>
      </div>
    </div>
  );
}
