import { defineConfig } from "vitest/config";

const config = defineConfig({
  cacheDir: "node_modules/.vitest-cache/unit",
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
    maxWorkers: "50%",
    mockReset: true,
    name: "eslint-plugin-unit",
    pool: "threads",
    restoreMocks: true,
    setupFiles: ["vitest.setup.ts"],
    testTimeout: 60_000,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});

export default config;
