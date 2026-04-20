import { config } from "@codeperfect/eslint-config";
import plugin from "eslint-plugin-eslint-plugin";
import { defineConfig } from "eslint/config";

import { all } from "./src";

/** Shared base ESLint config used to lint this package. */
const shared = await config({
  plugins: {
    codeperfect: false,
    playwright: false,
    "rxjs-x": false,
  },
  rules: { "import-x/no-nodejs-modules": "off" },
});

export default defineConfig(
  shared,
  all,
  {
    files: ["src/domain/**/*rule.ts"],
    ...plugin.configs["rules-recommended"],
  },
  {
    files: ["src/domain/**/*rule.spec.ts"],
    ...plugin.configs["tests-recommended"],
  },
);
