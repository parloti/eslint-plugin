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

/** Combined ESLint configuration for the workspace manager project. */
const eslintConfig = defineConfig(
  codePerfect,
  {
    ...all,
    files: ["**/*.ts"],
  },
  {
    files: ["**/*.ts"],
    rules: {
      "import-x/no-internal-modules": "off",
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
    files: ["**/*.ts"],
    name: "unicorn conflicts",
    rules: {
      "unicorn/comment-content": "off",
      "unicorn/consistent-arrow-return-style": "off",
      "unicorn/consistent-boolean-name": "off",
      "unicorn/consistent-class-member-order": "off",
      "unicorn/filename-case": [
        "error",
        { case: "kebabCase", ignore: ["^__tests__$"] },
      ],
      "unicorn/no-non-function-verb-prefix": "off",
      "unicorn/prefer-iterator-concat": "off",
    },
  },
  {
    files: ["**/*.spec.ts"],
    name: "codeperfect/assert-actual-expected-names precedence",
    rules: {
      "unicorn/consistent-boolean-name": ["error", { ignore: ["^actual"] }],
    },
  },
);

export default eslintConfig;
