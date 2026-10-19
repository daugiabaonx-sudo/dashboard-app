// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DARK_THEME,
  LIGHT_THEME,
  THEME_KEY,
  clearSavedTheme,
  describeThemeTitle,
  readSavedTheme,
  readSystemTheme,
  resolveThemeState,
  writeSavedTheme,
} from "@/lib/v2/v2-theme";
import { V2_MARKUP } from "@/components/v2/v2-markup";
import { installEffects } from "@/components/v2/v2-effects";
import type { V2Ctx } from "@/components/v2/v2-context";

describe("lib/v2/v2-theme — pure smart theme helpers", () => {
  it("reads valid saved themes and ignores invalid or unavailable storage", () => {
    const validDark = { getItem: vi.fn(() => "dark") };
    const validLight = { getItem: vi.fn(() => "light") };
    const invalid = { getItem: vi.fn(() => "sepia") };
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error("storage blocked");
      }),
    };

    expect(readSavedTheme(validDark)).toBe(DARK_THEME);
    expect(readSavedTheme(validLight)).toBe(LIGHT_THEME);
    expect(readSavedTheme(invalid)).toBeNull();
    expect(readSavedTheme(throwing)).toBeNull();
    expect(readSavedTheme(null)).toBeNull();
  });

  it("writes and clears saved theme safely with error handling", () => {
    const store = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const throwingStore = {
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(writeSavedTheme("dark", store)).toBe(true);
    expect(store.setItem).toHaveBeenCalledWith(THEME_KEY, "dark");
    expect(writeSavedTheme("light", throwingStore)).toBe(false);
    expect(writeSavedTheme("light", null)).toBe(false);

    expect(clearSavedTheme(store)).toBe(true);
    expect(store.removeItem).toHaveBeenCalledWith(THEME_KEY);
    expect(clearSavedTheme(throwingStore)).toBe(false);
    expect(clearSavedTheme(null)).toBe(false);
  });

  it("reads system theme from MediaQueryList and defaults to light when unavailable", () => {
    expect(readSystemTheme({ matches: true })).toBe("dark");
    expect(readSystemTheme({ matches: false })).toBe("light");
    expect(readSystemTheme(null)).toBe("light");
  });

  it("resolves immutable theme state with user preference overriding system preference", () => {
    const sysDark = resolveThemeState(null, "dark");
    expect(sysDark).toEqual({
      activeTheme: "dark",
      selectedTheme: null,
      source: "system",
      isLight: false,
      metaThemeColor: "#0b1120",
      title: describeThemeTitle("dark", "system"),
    });

    const userLight = resolveThemeState("light", "dark");
    expect(userLight).toEqual({
      activeTheme: "light",
      selectedTheme: "light",
      source: "user",
      isLight: true,
      metaThemeColor: "#f4f9fd",
      title: describeThemeTitle("light", "user"),
    });
  });
});

describe("V2 Day & Night switch markup and installEffects DOM integration", () => {
  let mqlMatches = false;
  let mqlListeners: Array<() => void> = [];
  let disposers: Array<() => void> = [];
  let toasts: string[] = [];

  beforeEach(() => {
    mqlMatches = false;
    mqlListeners = [];
    disposers = [];
    toasts = [];
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="#0b1120" />';
    document.body.innerHTML = `<div id="root">${V2_MARKUP}</div>`;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        get matches() {
          return query.includes("prefers-color-scheme: dark") ? mqlMatches : true;
        },
        media: query,
        addEventListener: vi.fn((_evt: string, cb: () => void) => {
          if (query.includes("prefers-color-scheme: dark")) {
            mqlListeners.push(cb);
          }
        }),
        removeEventListener: vi.fn(),
      })),
    });
  });

  function mountEffects() {
    const root = document.getElementById("root")!;
    const ctx = {
      root,
      $: (id: string) => root.querySelector(`#${id}`),
      on(target: EventTarget, type: string, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions | boolean) {
        target.addEventListener(type, fn, opts);
        disposers.push(() => target.removeEventListener(type, fn, opts));
      },
      later: () => undefined,
      alive: () => true,
      profile: { name: "Test Manager", initials: "TM", roleLabel: "Admin" },
      toast: (msg: string) => {
        toasts.push(msg);
      },
    } as unknown as V2Ctx;

    installEffects(ctx);
    return { root };
  }

  it("renders Day & Night switch anatomy inside #themeBtn in V2_MARKUP", () => {
    const switchEl = document.getElementById("themeBtn");
    const inputEl = document.getElementById("themeToggle") as HTMLInputElement | null;

    expect(switchEl).not.toBeNull();
    expect(switchEl?.classList.contains("dn-switch")).toBe(true);
    expect(inputEl).not.toBeNull();
    expect(inputEl?.getAttribute("role")).toBe("switch");
    expect(switchEl?.querySelectorAll(".dn-moon-hole")).toHaveLength(3);
    expect(switchEl?.querySelectorAll(".dn-black-cloud")).toHaveLength(3);
    expect(switchEl?.querySelectorAll(".dn-cloud")).toHaveLength(7);
    expect(switchEl?.querySelectorAll(".dn-star")).toHaveLength(5);
  });

  it("follows system dark theme when localStorage has no saved preference, and updates on OS change", () => {
    mqlMatches = true;
    mountEffects();

    const html = document.documentElement;
    const toggle = document.getElementById("themeToggle") as HTMLInputElement;
    const btn = document.getElementById("themeBtn")!;

    expect(html.dataset.theme).toBe("dark");
    expect(html.style.colorScheme).toBe("dark");
    expect(toggle.checked).toBe(false);
    expect(btn.getAttribute("data-source")).toBe("system");

    // Simulate OS switching to light mode
    mqlMatches = false;
    mqlListeners.forEach((cb) => cb());

    expect(html.dataset.theme).toBe("light");
    expect(html.style.colorScheme).toBe("light");
    expect(toggle.checked).toBe(true);
  });

  it("persists user choice on toggle change and resets to system preference on Alt+Click", () => {
    mqlMatches = true; // OS is dark
    mountEffects();

    const html = document.documentElement;
    const toggle = document.getElementById("themeToggle") as HTMLInputElement;
    const btn = document.getElementById("themeBtn")!;

    // Click/change switch to Light mode
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));

    expect(html.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(btn.getAttribute("data-source")).toBe("user");
    expect(toasts.at(-1)).toContain("Chế độ sáng");

    // Alt+Click on #themeBtn resets back to OS (dark)
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, altKey: true }));

    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(html.dataset.theme).toBe("dark");
    expect(toggle.checked).toBe(false);
    expect(btn.getAttribute("data-source")).toBe("system");
    expect(toasts.at(-1)).toContain("hệ thống");
  });

  it("synchronizes theme across tabs when window storage event fires", () => {
    mqlMatches = false;
    mountEffects();

    const html = document.documentElement;
    const toggle = document.getElementById("themeToggle") as HTMLInputElement;
    expect(html.dataset.theme).toBe("light");
    expect(toggle.checked).toBe(true);

    // Simulate another tab setting dark mode
    localStorage.setItem(THEME_KEY, "dark");
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: "dark" }));

    expect(html.dataset.theme).toBe("dark");
    expect(toggle.checked).toBe(false);
  });
});
