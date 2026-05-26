import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: ["**/index.ts", "**/*.types.ts"],
      include: ["src/**/*.ts"],
      thresholds: {
        branches: 10,
        functions: 10,
        lines: 10,
        statements: 10,
      },
    },
    include: ["tests/e2e/**/*.e2e.ts"],
    mockReset: true,
    name: "eslint-plugin-e2e",
    restoreMocks: true,
    setupFiles: ["test-setup.ts"],
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
