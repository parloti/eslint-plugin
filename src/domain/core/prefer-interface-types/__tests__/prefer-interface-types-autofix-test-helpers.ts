import { Linter } from "eslint";
import { parser } from "typescript-eslint";

import { preferInterfaceTypesRule } from "../rule";

/** Combined initial verification and iterative autofix result. */
interface RunVerifyAndFix {
  /** Iterative ESLint autofix result. */
  fixResult: ReturnType<Linter["verifyAndFix"]>;

  /** Diagnostics emitted on the initial lint pass. */
  messages: Linter.LintMessage[];
}

/** Flat ESLint configuration used for real-parser autofix tests. */
const ruleConfig: Linter.Config[] = [
  {
    files: ["**/*.ts"],
    languageOptions: { ecmaVersion: 2022, parser, sourceType: "module" },
    plugins: {
      codeperfect: {
        rules: { "prefer-interface-types": preferInterfaceTypesRule },
      },
    },
    rules: { "codeperfect/prefer-interface-types": "error" },
  },
];

/**
 * Runs the rule with autofix enabled against TypeScript source.
 * @param code TypeScript source to fix.
 * @returns ESLint verify-and-fix result.
 * @example
 * ```typescript
 * const result = runFix("const value = 1;");
 * ```
 */
function runFix(code: string): ReturnType<Linter["verifyAndFix"]> {
  return new Linter({ configType: "flat" }).verifyAndFix(
    code,
    ruleConfig,
    "example.ts",
  );
}

/**
 * Runs verification and autofix for tests that assert both passes.
 * @param code TypeScript source to inspect.
 * @returns Initial messages and autofix result.
 * @example
 * ```typescript
 * const result = runVerifyAndFix("const value = 1;");
 * ```
 */
function runVerifyAndFix(code: string): RunVerifyAndFix {
  const linter = new Linter({ configType: "flat" });

  return {
    fixResult: linter.verifyAndFix(code, ruleConfig, "example.ts"),
    messages: linter.verify(code, ruleConfig, "example.ts"),
  };
}

export { runFix, runVerifyAndFix };
