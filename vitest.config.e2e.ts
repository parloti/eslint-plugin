import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: ["**/index.ts", "**/*.types.ts", "**/*.spec.ts"],
      include: ["src/**/*.ts"],
      thresholds: { branches: 15, functions: 15, lines: 15, statements: 15 },
    },
    include: ["tests/e2e/**/*.e2e.ts"],
    mockReset: true,
    name: "eslint-plugin-e2e",
    restoreMocks: true,
    setupFiles: ["vitest.setup.ts"],
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
