import _default from "vite-tsconfig-paths";
import { defineConfig, defineProject } from "vitest/config";

/** Unit-test Vitest project definition. */
const unitProject = defineProject({
  test: { environment: "node", include: ["src/**/*.spec.ts"], name: "unit" },
});

/** End-to-end Vitest project definition. */
const endToEndProject = defineProject({
  test: { environment: "node", include: ["tests/**/*.spec.ts"], name: "e2e" },
});

export default defineConfig({
  plugins: [_default()],
  test: {
    coverage: {
      exclude: ["tests/e2e/**/*.ts"],
      enabled: true,
      include: ["src/**/*.ts", "tests/**/*.ts"],
      thresholds: { "100": true },
    },
    projects: [unitProject, endToEndProject],
  },
});
