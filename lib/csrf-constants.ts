/**
 * CSRF constants shared between server (lib/csrf.ts) and browser
 * (lib/csrf-client.ts). Pure module, no env or crypto imports — safe
 * to bundle into the client.
 */
export const CSRF_HEADER = "x-sunext-csrf";
export const CSRF_COOKIE_HTTP_ONLY = "sunext_csrf_token";
export const CSRF_COOKIE_READABLE = "sunext_csrf_token_readable";

export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
