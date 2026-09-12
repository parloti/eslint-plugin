import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      include: ["src/**/*.ts", "tests/support/**/*.ts"],
      reportsDirectory: "coverage/unit",
      thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
    include: ["src/**/*.spec.ts", "tests/support/**/*.spec.ts"],
    isolate: false,
    mockReset: true,
    name: "eslint-plugin-unit",
    pool: "threads",
    restoreMocks: true,
    setupFiles: ["vitest.setup.ts"],
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
