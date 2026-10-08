import type { NextConfig } from "next";

// In dev, React needs `'unsafe-eval'` to reconstruct callstacks and
// reconstruct component trees — without it the page hydrates as static HTML
// and every client component silently no-ops. We add it only when
// NODE_ENV !== "production" so production CSP is unaffected.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`, // next/script + hydration boot (+ react devtools in dev)
  "style-src 'self' 'unsafe-inline'", // tailwind, lucide-react
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://127.0.0.1:54321 wss://127.0.0.1:54321 http://127.0.0.1:54321",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Next 16 collapsed `experimental.ppr` + `force-dynamic` into a single
  // opt-in flag (`cacheComponents`). When on, server components can opt
  // into request-scoped React.cache + cross-request 'use cache' with
  // cacheLife(), and `<Suspense>` boundaries stream the rest of the tree
  // to the client as soon as their fallback is ready. See
  // node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md.
  cacheComponents: true,
  // Next 16 blocks cross-origin requests to dev resources (`/_next/hmr`,
  // etc.) by default. Playwright hits the dev server over `127.0.0.1` while
  // Next binds `localhost`; without this, HMR's WebSocket is rejected and
  // React never hydrates.
  //
  // Gated behind isDev so production bundles never ship a dev-origin
  // allowlist. A leaked allowlist would let any 127.0.0.1 / localhost
  // request reach the prod Next server if a misconfigured reverse proxy
  // or SSRF exposed those names.
  ...(isDev ? { allowedDevOrigins: ["127.0.0.1", "localhost"] } : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
