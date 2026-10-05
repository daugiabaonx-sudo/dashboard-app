// Lightweight, dependency-free i18n for the dashboard.
//
// Locale resolution is cookie-based (NEXT_LOCALE). Server components call
// `getRequestLocale()` to read the cookie via the Next.js `cookies()` API;
// client components call `useLocale()` (from `@/hooks/use-locale`). Missing
// or invalid cookies fall back to DEFAULT_LOCALE.
//
// Fallback: when a key is missing in the current locale, the translator falls
// back to the *other* locale so the UI never blanks out in either direction.
// If neither locale has the key, the dotted path is returned.

import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

export const LOCALES = ["en", "vi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const MESSAGES: Record<Locale, Record<string, unknown>> = { en, vi };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "vi";
}

export function getMessages(locale: Locale): Record<string, unknown> {
  return MESSAGES[locale];
}

type Primitive = string | number | boolean;
type Path = readonly (string | number)[];

function getByPath(obj: unknown, path: Path): unknown {
  let cursor: unknown = obj;
  for (const key of path) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as { [key: string]: unknown })[key as string];
  }
  return cursor;
}

function interpolateInternal(
  template: string,
  vars?: Record<string, Primitive | undefined>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}

export function interpolate(
  template: string,
  vars?: Record<string, Primitive | undefined>,
): string {
  return interpolateInternal(template, vars);
}

export function serializeLocaleCookie(locale: Locale): string {
  return locale;
}

export function parseLocaleCookie(
  value: string | null | undefined,
): Locale | null {
  if (!value) return null;
  return isLocale(value) ? value : null;
}

export function getRequestLocale(
  cookieReader: () => string | undefined,
): Locale {
  const fromCookie = parseLocaleCookie(cookieReader());
  return fromCookie ?? DEFAULT_LOCALE;
}

export function makeTranslator(locale: Locale) {
  const messages = MESSAGES[locale];
  const fallbackLocale: Locale = locale === "en" ? "vi" : "en";
  const fallbackMessages = MESSAGES[fallbackLocale];

  function t(path: string, vars?: Record<string, Primitive | undefined>): string {
    const segments = path.split(".");
    const raw = getByPath(messages, segments);
    if (typeof raw === "string") return interpolateInternal(raw, vars);

    const fallback = getByPath(fallbackMessages, segments);
    if (typeof fallback === "string") return interpolateInternal(fallback, vars);

    return path;
  }

  function tArray(path: string): string[] {
    const segments = path.split(".");
    const raw = getByPath(messages, segments);
    if (Array.isArray(raw) && raw.every((x): x is string => typeof x === "string")) {
      return raw;
    }
    const fallback = getByPath(fallbackMessages, segments);
    if (Array.isArray(fallback) && fallback.every((x): x is string => typeof x === "string")) {
      return fallback;
    }
    return [];
  }

  return { t, tArray, locale };
}