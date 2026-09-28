import type { NextConfig } from "next";

// Production CSP: drop `'unsafe-inline'` from `script-src` and the
// `style-src` allowance for CSS-in-JS libraries that ship default classes.
// Next.js's runtime requires both, plus `'self'` + the Supabase domains
// the client connects to. Adjust origins when adding new CDN deps.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // next/script + hydration boot
  "style-src 'self' 'unsafe-inline'", // tailwind, lucide-react
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://127.0.0.1:54321 http://127.0.0.1:54321",
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
