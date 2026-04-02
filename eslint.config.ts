import type { BoundariesConfig } from "@codeperfect/eslint-config";

import { config } from "@codeperfect/eslint-config";
import { defineConfig } from "eslint/config";

import { all } from "./src";

/** Shared base ESLint config used to lint this package. */
const shared = await config({
  boundaries: {
    elements: [
      { mode: "full", pattern: "src/index.ts", type: "entrypoint" },
      { basePattern: "src", pattern: "application", type: "application" },
      {
        basePattern: "src",
        pattern: "infrastructure",
        type: "infrastructure",
      },
      { basePattern: "src", pattern: "domain", type: "domain" },
    ],
    elementTypes: [
      "error",
      {
        default: "disallow",
        rules: [
          {
            allow: { to: { type: ["application", "infrastructure"] } },
            from: { type: "entrypoint" },
          },
          {
            allow: { to: { type: "domain" } },
            from: { type: "application" },
          },
          {
            allow: {
              to: { type: ["application", "domain"] },
            },
            from: { type: "infrastructure" },
          },
        ],
      },
    ],
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.spec.ts"],
  } satisfies BoundariesConfig,
  disabledPlugins: ["codeperfect", "rxjs-x", "jasmine", "jest", "playwright"],
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
