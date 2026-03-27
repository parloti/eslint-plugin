import { config } from "@codeperfect/eslint-config";
import { defineConfig } from "eslint/config";
import { all } from "./src";

const shared = await config({
  disabledPlugins: [
    "boundaries",
    "codeperfect",
    "rxjs-x",
    "jasmine",
    "jest",
    "playwright",
  ],
});

export default defineConfig(shared, all);
