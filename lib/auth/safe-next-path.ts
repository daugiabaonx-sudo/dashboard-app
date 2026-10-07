// lib/auth/safe-next-path.ts
// Validates the `?next=` param used after sign-in so it can only point at a
// same-origin dashboard path (blocks `//evil.com`, `/\evil.com`, schemes,
// header-injection payloads and loops back to the auth pages).

const BASE = "http://sunext.invalid";
const AUTH_PATHS = new Set(["/login", "/signup"]);
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;

function decodeSafely(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  const decoded = decodeSafely(raw);
  if (decoded === null || UNSAFE_CHARS.test(raw) || UNSAFE_CHARS.test(decoded)) return "/";

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE || AUTH_PATHS.has(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
