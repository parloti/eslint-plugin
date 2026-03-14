import { defineConfig } from "eslint/config";
import globals from "globals";
import { parser } from "typescript-eslint";

import codeperfectPlugin from "./src";

export default defineConfig(
  {
    ignores: ["coverage/**", "dist/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
      },
      parser,
      sourceType: "module",
    },
    plugins: {
      codeperfect: codeperfectPlugin,
    },
    rules: {
      "codeperfect/barrel-files-exports-only": "error",
      "codeperfect/consistent-barrel-files": "error",
      "codeperfect/no-interface-member-docs": "error",
      "codeperfect/no-reexports-outside-barrels": "error",
      "codeperfect/prefer-interface-types": "error",
      "codeperfect/require-example-language": "error",
      "codeperfect/require-test-companion": "error",
      "codeperfect/single-line-jsdoc": "error",
    },
  },
  {
    files: ["**/*.spec.ts"],
    rules: {
      "codeperfect/prefer-vi-mocked-import": "error",
    },
  },
);
