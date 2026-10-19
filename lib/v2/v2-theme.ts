// lib/v2/v2-theme.ts
// Pure, immutable helpers for the V2 Day & Night theme toggle.
// Supports 3-tier resolution: explicit user choice (localStorage["sunext-theme"])
// overriding operating-system preference (prefers-color-scheme: dark), with
// cross-tab synchronization and browser color-scheme / meta theme-color updates.

export const THEME_KEY = "sunext-theme";
export const DARK_THEME = "dark";
export const LIGHT_THEME = "light";

export type V2Theme = typeof DARK_THEME | typeof LIGHT_THEME;
export type V2ThemeSource = "user" | "system";

export interface V2ThemeState {
  readonly activeTheme: V2Theme;
  readonly selectedTheme: V2Theme | null;
  readonly source: V2ThemeSource;
  readonly isLight: boolean;
  readonly metaThemeColor: string;
  readonly title: string;
}

/**
 * Safely read a saved theme ("dark" | "light") from Web Storage.
 * Returns null when unset, invalid, or when storage throws.
 */
export function readSavedTheme(storage?: Pick<Storage, "getItem"> | null): V2Theme | null {
  if (!storage) return null;
  try {
    const saved = storage.getItem(THEME_KEY);
    if (saved === DARK_THEME || saved === LIGHT_THEME) {
      return saved;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely persist a user-selected theme ("dark" | "light") to Web Storage.
 * Returns true when written, or false if storage is unavailable.
 */
export function writeSavedTheme(theme: V2Theme, storage?: Pick<Storage, "setItem"> | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely remove the saved user theme from Web Storage so OS preference takes over.
 * Returns true when cleared, or false if storage is unavailable.
 */
export function clearSavedTheme(storage?: Pick<Storage, "removeItem"> | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(THEME_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the operating system theme from a `(prefers-color-scheme: dark)` MediaQueryList.
 */
export function readSystemTheme(mql?: { readonly matches: boolean } | null): V2Theme {
  return mql?.matches ? DARK_THEME : LIGHT_THEME;
}

/**
 * Build a human-readable Vietnamese tooltip describing active mode, source, and reset shortcut.
 */
export function describeThemeTitle(activeTheme: V2Theme, source: V2ThemeSource): string {
  const modeLabel = activeTheme === LIGHT_THEME ? "Chế độ sáng" : "Chế độ tối";
  const sourceLabel = source === "user" ? "Bạn đã chọn" : "Theo hệ thống";
  return `${modeLabel} (${sourceLabel}) · Giữ Alt + Click để đặt lại theo hệ thống`;
}

/**
 * Compute an immutable V2ThemeState snapshot from manual selection and system preference.
 */
export function resolveThemeState(selectedTheme: V2Theme | null, systemTheme: V2Theme): V2ThemeState {
  const activeTheme: V2Theme = selectedTheme ?? systemTheme;
  const source: V2ThemeSource = selectedTheme ? "user" : "system";
  const isLight = activeTheme === LIGHT_THEME;

  return {
    activeTheme,
    selectedTheme,
    source,
    isLight,
    metaThemeColor: isLight ? "#f4f9fd" : "#0b1120",
    title: describeThemeTitle(activeTheme, source),
  };
}
