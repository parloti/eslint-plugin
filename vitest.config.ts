import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: ["**/index.ts", "**/*.types.ts"],
      include: ["src/**/*.ts", "tests/support/**/*.ts"],
      thresholds: {
        "100": true,
      },
    },
    include: ["src/**/*.spec.ts", "tests/support/**/*.spec.ts"],
    mockReset: true,
    name: "eslint-plugin-unit",
    restoreMocks: true,
    setupFiles: ["test-setup.ts"],
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
