import type { Rule } from "eslint";

import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslint from "typescript-eslint";
import * as vitest from "vitest";

/**
 *
 */
const e2eRuleTestTimeout = 45_000;

/**
 *
 */
interface E2ERuleTester {
  /**
   *
   */
  run: (
    name: string,
    rule: Rule.RuleModule,
    tests: Parameters<RuleTester["run"]>[2],
  ) => void;
}

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = (name, test) => {
  vitest.it(name, test, e2eRuleTestTimeout);
};
RuleTester.itOnly = (name, test) => {
  vitest.it.only(name, test, e2eRuleTestTimeout);
};

/**
 * @example
 */
const createRuleTester = (): E2ERuleTester => {
  const ruleTester = new RuleTester({
    languageOptions: {
      ecmaVersion: 2022,
      parser: tseslint.parser,
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

export { createRuleTester };
