import type { Rule } from "eslint";

import { RuleTester } from "@typescript-eslint/rule-tester";
import { parser } from "typescript-eslint";
import * as vitest from "vitest";

import type { TemporaryFixtureManager } from "./temporary-fixtures";

import { createTemporaryFixtureManager } from "./temporary-fixtures";

/** Timeout applied to slower end-to-end RuleTester suites. */
const endToEndRuleTestTimeout = 45_000;

/** Rule tester surface used by the e2e suites. */
interface EndToEndRuleTester {
  /**
   * Registers one RuleTester suite with Vitest.
   * @param name Rule name under test.
   * @param rule Rule module under test.
   * @param tests Valid and invalid test cases.
   */
  run: (
    name: string,
    rule: Rule.RuleModule,
    tests: Parameters<RuleTester["run"]>[2],
  ) => void;
}

/** Rule test cases passed through to RuleTester. */
type RuleTesterSuite = Parameters<EndToEndRuleTester["run"]>[2];

/**
 * Registers RuleTester cleanup hooks with Vitest.
 * @param handler Cleanup callback provided by RuleTester.
 * @example
 * ```typescript
 * registerAfterAll(() => {
 *   // cleanup side effects
 * });
 * ```
 */
const registerAfterAll: NonNullable<typeof RuleTester.afterAll> = (
  handler,
): void => {
  vitest.afterAll(handler);
};

/**
 * Registers RuleTester suite wrappers with Vitest.
 * @param text Suite name.
 * @param method Suite body.
 * @example
 * ```typescript
 * registerDescribe("demo", () => {
 *   // suite body
 * });
 * ```
 */
const registerDescribe: NonNullable<typeof RuleTester.describe> = (
  text,
  method,
): void => {
  vitest.describe(text, method);
};

/**
 * Registers RuleTester cases with the shared timeout.
 * @param name Test case name.
 * @param test Test implementation.
 * @example
 * ```typescript
 * registerIt("demo", () => {
 *   // case body
 * });
 * ```
 */
const registerIt: NonNullable<typeof RuleTester.it> = (name, test): void => {
  vitest.it(name, test, endToEndRuleTestTimeout);
};

/**
 * Registers focused RuleTester cases with the shared timeout.
 * @param name Test case name.
 * @param test Test implementation.
 * @example
 * ```typescript
 * registerItOnly("demo", () => {
 *   // focused case body
 * });
 * ```
 */
const registerItOnly: NonNullable<typeof RuleTester.itOnly> = (
  name,
  test,
): void => {
  vitest.it.only(name, test, endToEndRuleTestTimeout);
};

RuleTester.afterAll = registerAfterAll;
RuleTester.describe = registerDescribe;
RuleTester.it = registerIt;
RuleTester.itOnly = registerItOnly;

/**
 * Creates the shared RuleTester wrapper used by the end-to-end specs.
 * @returns Rule tester wrapper with the project parser preconfigured.
 * @example
 * ```typescript
 * const ruleTester = createRuleTester();
 * void ruleTester;
 * ```
 */
const createRuleTester = (): EndToEndRuleTester => {
  const ruleTester = new RuleTester({
    languageOptions: {
      ecmaVersion: 2022,
      parser,
      sourceType: "module",
    },
  });

  return {
    run: (name, rule, tests): void => {
      ruleTester.run(
        name,
        rule as unknown as Parameters<RuleTester["run"]>[1],
        tests,
      );
    },
  };
};

/**
 * Defines one end-to-end RuleTester suite.
 * @param name Rule name under test.
 * @param rule Rule module under test.
 * @param tests Valid and invalid RuleTester cases.
 * @example
 * ```typescript
 * defineRuleTesterSuite("demo-rule", demoRule, { invalid: [], valid: [] });
 * ```
 */
const defineRuleTesterSuite = (
  name: string,
  rule: Rule.RuleModule,
  tests: RuleTesterSuite,
): void => {
  createRuleTester().run(name, rule, tests);
};

/**
 * Defines one fixture-backed end-to-end RuleTester suite.
 * @param name Rule name under test.
 * @param rule Rule module under test.
 * @param createTests Callback that builds the RuleTester cases from one fixture manager.
 * @example
 * ```typescript
 * defineTemporaryFixtureRuleTesterSuite("demo-rule", demoRule, ({ createFixtureSet }) => ({
 *   invalid: [{ code: "export const value = 1;", filename: createFixtureSet({ "feature.ts": "export const value = 1;" }).getFilePath("feature.ts") }],
 *   valid: [],
 * }));
 * ```
 */
const defineTemporaryFixtureRuleTesterSuite = (
  name: string,
  rule: Rule.RuleModule,
  createTests: (fixtureManager: TemporaryFixtureManager) => RuleTesterSuite,
): void => {
  const fixtureManager = createTemporaryFixtureManager();

  vitest.afterAll(fixtureManager.cleanupTemporaryDirectories);
  defineRuleTesterSuite(name, rule, createTests(fixtureManager));
};

export {
  createRuleTester,
  defineRuleTesterSuite,
  defineTemporaryFixtureRuleTesterSuite,
};
