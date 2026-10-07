// lib/auth/remembered-email.ts
// "Remember me" for the login form: persists ONLY the email (never the
// password) in a Storage-like store. Supabase already owns the session
// cookie, so this is purely a convenience pre-fill. All access is guarded
// because Safari private mode / disabled storage can throw.

import { emailSchema } from "@/lib/schemas/auth";

export const REMEMBERED_EMAIL_KEY = "sunext.login.email";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

function safeRemove(store: KeyValueStore): void {
  try {
    store.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Storage unavailable — nothing to clean up.
  }
}

export function readRememberedEmail(store: KeyValueStore | null): string | null {
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(REMEMBERED_EMAIL_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  if (!isValidEmail(raw)) {
    safeRemove(store);
    return null;
  }
  return raw;
}

export function persistRememberedEmail(
  store: KeyValueStore | null,
  email: string,
  remember: boolean,
): void {
  if (!store) return;
  const normalized = normalize(email);
  if (!remember || !isValidEmail(normalized)) {
    safeRemove(store);
    return;
  }
  try {
    store.setItem(REMEMBERED_EMAIL_KEY, normalized);
  } catch {
    // Quota exceeded / storage disabled — remembering is best-effort.
  }
}

/** Browser localStorage, or null during SSR / when access is blocked. */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
