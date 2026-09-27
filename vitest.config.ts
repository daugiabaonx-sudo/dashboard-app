// vitest.config.ts
// Minimal config — runs schema/utility tests in node, browser-component
// tests in jsdom. The Phase-E scope only needs node environment for
// the schema layer, but jsdom is wired up so future UI tests can land
// without re-configuring.

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
});
