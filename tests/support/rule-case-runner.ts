import type { Linter, Rule } from "eslint";

import { Linter as EslintLinter } from "eslint";
import { parser } from "typescript-eslint";

/** One end-to-end rule case executed through the flat-config linter. */
interface EndToEndRuleCase {
  /** Source code under test. */
  code: string;

  /** Expected lint errors for invalid cases. */
  errors?: RuleMessageExpectation[];

  /** Optional filename passed to the linter. */
  filename?: string;

  /** Additional language options required by the rule case. */
  languageOptions?: NonNullable<Linter.Config["languageOptions"]>;

  /** Rule options passed after the severity level. */
  options?: unknown[];

  /** Expected autofix output when the rule supplies fixes. */
  output?: string;
}

/** Result returned after running one rule case. */
interface RuleCaseRunResult {
  /** Message ids emitted by the rule. */
  messageIds: (string | undefined)[];

  /** Fixed output when the rule case requested an autofix run. */
  output?: string;
}

/** One expected rule message identified by its message id. */
interface RuleMessageExpectation {
  /** Rule message id expected from the lint run. */
  messageId: string | undefined;
}

/** Default filename used when a case does not declare one. */
const defaultFilename = "example.spec.ts";

/**
 * Creates the flat ESLint config used for one rule case.
 * @param ruleName Rule name without the plugin prefix.
 * @param rule Rule implementation under test.
 * @param testCase Rule case to execute.
 * @returns Flat ESLint config for the supplied case.
 * @example
 * ```typescript
 * const config = createRuleConfig("demo-rule", demoRule, { code: "const value = 1;" });
 * void config;
 * ```
 */
const createRuleConfig = (
  ruleName: string,
  rule: Rule.RuleModule,
  testCase: EndToEndRuleCase,
): Linter.Config[] => {
  const languageOptions: NonNullable<Linter.Config["languageOptions"]> = {
    ecmaVersion: 2022,
    parser,
    sourceType: "module",
  };

  if (testCase.languageOptions !== void 0) {
    Object.assign(languageOptions, testCase.languageOptions);
  }

  return [
    {
      files: ["**/*.ts"],
      languageOptions,
      plugins: {
        codeperfect: {
          rules: {
            [ruleName]: rule,
          },
        },
      },
      rules: {
        [`codeperfect/${ruleName}`]: ["error", ...(testCase.options ?? [])],
      },
    },
  ];
};

/**
 * Runs one rule case and returns the observed message ids and optional fixed output.
 * @param ruleName Rule name without the plugin prefix.
 * @param rule Rule implementation under test.
 * @param testCase Rule case to execute.
 * @returns Observed lint result for the supplied case.
 * @example
 * ```typescript
 * const result = runRuleCase("demo-rule", demoRule, { code: "const value = 1;" });
 * void result;
 * ```
 */
const runRuleCase = (
  ruleName: string,
  rule: Rule.RuleModule,
  testCase: EndToEndRuleCase,
): RuleCaseRunResult => {
  const linter = new EslintLinter({ configType: "flat" });
  const config = createRuleConfig(ruleName, rule, testCase);
  const filename = testCase.filename ?? defaultFilename;
  const messages = linter.verify(testCase.code, config, filename);
  const output =
    testCase.output === void 0
      ? void 0
      : linter.verifyAndFix(testCase.code, config, filename).output;

  return {
    messageIds: messages.map((message) => message.messageId),
    ...(output === void 0 ? {} : { output }),
  };
};

export { runRuleCase };
export type { EndToEndRuleCase, RuleCaseRunResult };
