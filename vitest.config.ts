// vitest.config.ts
// Minimal config — runs schema/utility/db/auth/api tests in node, with
// coverage gated at the ECC 80% threshold. The include glob covers both
// `tests/unit/**` (lib/db/* + lib/auth/* + existing utility tests) and
// `tests/integration/**` (app/api/** route handlers invoked directly
// with constructed Request objects).

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // The `server-only` package is a runtime guard against accidental
      // client imports of server modules. In Vitest (node env) the package
      // has no implementation, so we alias it to an empty module — the
      // import becomes a no-op without disabling the guard in production.
      "server-only": path.resolve(__dirname, "tests/_empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
    ],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "lib/supabase/mock.ts",
        "lib/supabase/client.ts",
        "lib/data.ts",
        "lib/types.ts",
        "lib/**/index.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
