import { Linter } from "eslint";
import { parser } from "typescript-eslint";

import { noUnsafeVitestMockFactoryCastRule } from "../rule";

/** Type definition for rule data. */
interface FixRunResult {
  /** Lint messages produced during the run. */
  messages: Linter.LintMessage[];

  /** Output code after fixes. */
  output: string;
}

/**
 * Runs the no-unsafe-vitest-mock-factory-cast rule with autofix enabled.
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
              "no-unsafe-vitest-mock-factory-cast":
                noUnsafeVitestMockFactoryCastRule,
            },
          },
        },
        rules: { "codeperfect/no-unsafe-vitest-mock-factory-cast": "error" },
      },
    ],
    { filename: "example.spec.ts" },
  );

  return { messages: result.messages, output: result.output };
};

export { runFix };
