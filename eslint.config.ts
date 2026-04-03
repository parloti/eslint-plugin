import { config } from "@codeperfect/eslint-config";
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

export default defineConfig(shared, all);
