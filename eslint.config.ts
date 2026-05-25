import { config } from "@codeperfect/eslint-config";
import plugin from "eslint-plugin-eslint-plugin";
import { defineConfig } from "eslint/config";

import { all } from "./src";

/** CodePerfect ESLint configuration with custom rules and boundaries. */
const codePerfect = await config({
  plugins: {
    codeperfect: false,
    playwright: false,
    "rxjs-x": false,
    "vitest-e2e": true,
  },
});

/** Combined ESLint configuration for the workspace manager project. */
const eslintConfig = defineConfig(
  {
    ignores: ["tmp/**"],
    name: "Local temporary artifacts",
  },
  codePerfect,
  all,
  {
    files: ["eslint.config.ts", "release.config.ts"],
    name: "Repository config files",
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "import-x/no-unresolved": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    name: "Declaration files",
    rules: {
      "jsdoc/require-jsdoc": "off",
    },
  },
  {
    files: ["src/index.ts"],
    name: "Package entrypoint barrel",
    rules: {
      "boundaries/dependencies": "off",
    },
  },
  {
    name: "Node.js tool",
    rules: { "import-x/no-nodejs-modules": "off" },
  },
  {
    files: ["src/domain/**/*rule.ts"],
    ...plugin.configs["rules-recommended"],
  },
  {
    files: ["src/domain/**/*rule.spec.ts"],
    ...plugin.configs["tests-recommended"],
  },
  {
    files: ["**/*.{spec,test,e2e}.ts"],
    name: "Test files should allow unbound methods for better assertion flexibility",
    rules: { "@typescript-eslint/unbound-method": "off" },
  },
  {
    files: ["tests/support/**/*.spec.ts"],
    name: "Support spec helpers",
    rules: {
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/require-await": "off",
      "codeperfect/enforce-aaa-phase-purity": "off",
      "codeperfect/prefer-interface-types": "off",
      "codeperfect/require-act-result-capture": "off",
      "codeperfect/single-act-statement": "off",
      "jsdoc/check-alignment": "off",
      "jsdoc/no-blank-blocks": "off",
      "jsdoc/require-description": "off",
      "vitest/max-expects": "off",
    },
  },
);
export default eslintConfig;
