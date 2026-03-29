import { Linter } from "eslint";
import { parser } from "typescript-eslint";

import { preferViMockedImportRule } from "./rule";

/** Type definition for rule data. */
interface FixRunResult {
  /** Lint messages produced during the run. */
  messages: Linter.LintMessage[];

  /** Output code after fixes. */
  output: string;
}

/**
 * Runs the prefer-vi-mocked-import rule with autofix enabled.
 * @param code Input code.
 * @returns Fixed output and messages.
 * @example
 * ```typescript
 * const result = runFix("const value = 1;\n");
 * ```
 */
const runFix = (code: string): FixRunResult => {
  const linter = new Linter({ configType: "flat" });

  const result = linter.verifyAndFix(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: {
          ecmaVersion: 2022,
          parser,
          parserOptions: { range: true },
          sourceType: "module",
        },
        plugins: {
          codeperfect: {
            rules: {
              "prefer-vi-mocked-import": preferViMockedImportRule,
            },
          },
        },
        rules: {
          "codeperfect/prefer-vi-mocked-import": "error",
        },
      },
    ],
    { filename: "example.spec.ts" },
  );

  return { messages: result.messages, output: result.output };
};

export { runFix };
