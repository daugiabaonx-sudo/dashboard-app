// Lightweight, dependency-free i18n for the dashboard refactor.
//
// Phase 1: synchronous lookup against messages/en.json. Locale resolution
// is a constant today — the dashboard ships English-only. The shape of
// the keys here is intentionally compatible with next-intl's nested keys
// if a second locale is reintroduced later.

import en from "@/messages/en.json";

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const MESSAGES: Record<Locale, { [key: string]: unknown }> = { en };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en";
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

export function makeTranslator(locale: Locale) {
  const messages = MESSAGES[locale];

  function t(path: string, vars?: Record<string, Primitive | undefined>): string {
    const raw = getByPath(messages, path.split("."));
    if (typeof raw !== "string") {
      // Fallback to Vietnamese so the UI never blanks out in dev.
      const fallback = getByPath(MESSAGES[DEFAULT_LOCALE], path.split("."));
      if (typeof fallback === "string") return interpolate(fallback, vars);
      return path;
    }
    return interpolate(raw, vars);
  }

  return { t, locale };
}

function interpolate(
  template: string,
  vars?: Record<string, Primitive | undefined>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}