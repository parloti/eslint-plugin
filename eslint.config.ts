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
      globals: globals.node,
      parser,
      sourceType: "module",
    },
    plugins: {
      codeperfect: codeperfectPlugin,
    },
    rules: Object.fromEntries(
      Object.keys(codeperfectPlugin.rules).map((ruleName) => [
        `codeperfect/${ruleName}`,
        "error",
      ]),
    ),
  },
);
