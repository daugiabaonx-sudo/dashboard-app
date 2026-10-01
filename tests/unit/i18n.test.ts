// tests/unit/i18n.test.ts
// Tests for the lightweight dashboard i18n helper. Verifies locale
// validation, dotted-key lookup, missing-key behavior, and variable
// interpolation. The dashboard is English-only today; if a second locale
// is added later, re-introduce the dual-locale fallback test below.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getMessages,
  isLocale,
  makeTranslator,
} from "@/lib/i18n";

describe("LOCALES / DEFAULT_LOCALE", () => {
  it("exposes only en, with en as the default", () => {
    expect(LOCALES).toEqual(["en"]);
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

describe("isLocale", () => {
  it("accepts only the declared locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("vi")).toBe(false);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("getMessages", () => {
  it("returns the full namespace tree for a known locale", () => {
    const messages = getMessages("en");
    expect(messages.dashboard).toBeDefined();
    expect(messages.common).toBeDefined();
    expect(messages.topBar).toBeDefined();
    expect(messages.sidebar).toBeDefined();
  });
});

describe("makeTranslator", () => {
  const { t } = makeTranslator("en");

  it("resolves a top-level key", () => {
    expect(t("common.loading")).toBe("Loading…");
  });

  it("resolves a nested key", () => {
    expect(t("dashboard.kpi.overdue")).toBe("Overdue");
  });

  it("returns the key itself when the path is missing", () => {
    expect(t("nope.nada.nothing")).toBe("nope.nada.nothing");
  });

  it("interpolates {placeholders}", () => {
    expect(t("common.welcomeBack", { name: "Minh" })).toBe(
      "Welcome back, Minh",
    );
  });

  it("keeps the placeholder text when the var is undefined", () => {
    expect(t("common.welcomeBack", { name: undefined })).toBe(
      "Welcome back, {name}",
    );
  });
});

describe("makeTranslator fallback", () => {
  const en = makeTranslator("en");

  it("exposes the English namespace when locale is en", () => {
    expect(en.t("dashboard.kpi.overdue")).toBe("Overdue");
  });

  it("returns the key path when neither the locale nor the default has it", () => {
    // English-only — there is no second locale to fall back to. The translator
    // returns the dotted path so the UI never blanks out silently.
    expect(en.t("common.loading")).toBe("Loading…");
    expect(en.t("missing.path.here")).toBe("missing.path.here");
  });
});