import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: ["**/*.spec.ts"],
      include: ["src/**/*.ts"],
      reportsDirectory: "coverage/e2e",
      thresholds: { branches: 15, functions: 15, lines: 15, statements: 15 },
    },
    include: ["tests/e2e/**/*.e2e.ts"],
    isolate: false,
    mockReset: true,
    name: "eslint-plugin-e2e",
    pool: "threads",
    restoreMocks: true,
    setupFiles: ["vitest.setup.ts"],
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
