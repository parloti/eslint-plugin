import type { UserConfig } from "@commitlint/types";

/** Commitlint configuration with emoji support. */
export default {
  extends: ["@codeperfect/commitlint-config-emoji"],
} satisfies UserConfig;
