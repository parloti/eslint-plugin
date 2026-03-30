import { config } from "@codeperfect/eslint-config";
import { defineConfig } from "eslint/config";

import { all } from "./src";

/** Shared base ESLint config used to lint this package. */
const shared = await config({
  disabledPlugins: [
    "boundaries",
    "codeperfect",
    "rxjs-x",
    "jasmine",
    "jest",
    "playwright",
  ],
  rules: { "import-x/no-nodejs-modules": "off" },
});

export default defineConfig(shared, all, {
  files: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
  rules: {
    "codeperfect/enforce-aaa-phase-purity": "off",
    "codeperfect/require-aaa-sections": "off",
    "codeperfect/single-act-statement": "off",
  },
});
