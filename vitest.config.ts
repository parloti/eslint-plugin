import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: [
        "**/index.ts",
        "**/*.types.ts",
        "**/types.ts",
        "src/domain/architecture/consistent-barrel-files/no-import-export-aliases-rule.ts",
        "src/domain/architecture/consistent-barrel-files/no-import-export-extensions-rule.ts",
        "src/domain/testing/prefer-vi-mocked-import/fix-imports.ts",
      ],
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
