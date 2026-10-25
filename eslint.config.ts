import { config } from "@codeperfect/eslint-config";
import plugin from "eslint-plugin-eslint-plugin";
import { defineConfig } from "eslint/config";

import { all } from "./src";

/** CodePerfect ESLint configuration. */
const codePerfect = await config({
  plugins: {
    codeperfect: false,
    playwright: false,
    "rxjs-x": false,
    "vitest-e2e": true,
  },
});

const customConfigs = defineConfig(
  { ...all, files: ["**/*.ts"] },
  {
    files: ["src/adapters/angular/plugin.ts"],
    name: "Angular package public API",
    rules: {
      "codeperfect/no-unused-exports": [
        "error",
        { publicApiFiles: ["src/adapters/angular/plugin.ts"] },
      ],
      "codeperfect/no-unused-public-members": [
        "error",
        { publicApiFiles: ["src/adapters/angular/plugin.ts"] },
      ],
    },
  },
  { files: ["**/*.ts"], rules: { "import-x/no-internal-modules": "off" } },
  { name: "Node.js tool", rules: { "import-x/no-nodejs-modules": "off" } },
  { files: ["src/domain/**/*rule.ts"], ...plugin.configs["rules-recommended"] },
  {
    files: ["src/domain/**/*rule.spec.ts"],
    ...plugin.configs["tests-recommended"],
  },
  {
    files: ["**/*.ts"],
    rules: { "eslint-plugin/require-meta-has-suggestions": "off" },
  },
);

/** Combined ESLint configuration for the solution. */
const eslintConfig = defineConfig(codePerfect, ...customConfigs);

export default eslintConfig;
