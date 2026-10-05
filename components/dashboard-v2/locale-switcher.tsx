// components/dashboard-v2/locale-switcher.tsx
// Client-side locale toggle. Renders a globe + current language code, opens
// a radix dropdown with EN/VI options, and writes NEXT_LOCALE + refreshes.

"use client";

import { Globe } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import {
  LOCALES,
  type Locale,
} from "@/lib/i18n";

const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  vi: "VI",
};

interface LocaleSwitcherLabels {
  trigger: string;
  language: string;
  languageEn: string;
  languageVi: string;
}

interface LocaleSwitcherProps {
  labels: LocaleSwitcherLabels;
}

export function LocaleSwitcher({ labels }: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/CSR mismatch — the cookie is read on mount, so render the
  // trigger in a stable "EN" state on the server, swap to the real locale
  // after hydration.
  useEffect(() => {
    setMounted(true);
  }, []);

  const display = mounted ? LOCALE_LABEL[locale] : "EN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={labels.trigger}
          data-testid="locale-switcher"
          className="gap-1.5"
        >
          <Globe className="size-4" aria-hidden />
          <span className="text-xs font-semibold tracking-wide">
            {display}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>{labels.language}</DropdownMenuLabel>
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            active={mounted && code === locale}
            onSelect={(event) => {
              event.preventDefault();
              startTransition(() => {
                setLocale(code);
              });
            }}
          >
            <span className="text-xs font-semibold tracking-wide opacity-70">
              {LOCALE_LABEL[code]}
            </span>
            <span className="ml-1">
              {code === "en" ? labels.languageEn : labels.languageVi}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}