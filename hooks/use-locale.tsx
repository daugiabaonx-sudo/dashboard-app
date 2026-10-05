"use client";

// useLocale — client-side locale hook. Reads the NEXT_LOCALE cookie on mount
// (set by the server when rendering the page), exposes a setter that writes
// the cookie and calls `router.refresh()` so server components re-render
// under the new locale without a full page reload.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  type Locale as Locale,
  isLocale as isLocaleCookieRead,
  DEFAULT_LOCALE,
} from "@/lib/i18n";

function readCookie(name: string): Locale | undefined {
  if (typeof document === "undefined") return undefined;
  const target = `${name}=`;
  for (const entry of document.cookie.split(";")) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(target)) {
      const value = trimmed.slice(target.length);
      if (isLocaleCookieRead(value)) return value;
    }
  }
  return undefined;
}

function writeCookie(name: string, value: Locale): void {
  if (typeof document === "undefined") return;
  const oneYearSeconds = LOCALE_COOKIE_MAX_AGE;
  document.cookie = `${name}=${value}; Path=/; Max-Age=${oneYearSeconds}; SameSite=Lax`;
}

export interface UseLocaleResult {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

export function useLocale(): UseLocaleResult {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(() => {
    return readCookie(LOCALE_COOKIE_NAME) ?? DEFAULT_LOCALE;
  });

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      writeCookie(LOCALE_COOKIE_NAME, next);
      setLocaleState(next);
      router.refresh();
    },
    [locale, router],
  );

  return { locale, setLocale };
}