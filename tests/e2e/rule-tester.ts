import type { Rule } from "eslint";

import tseslint from "typescript-eslint";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";

interface E2ERuleTester {
  run: (
    name: string,
    rule: Rule.RuleModule,
    tests: Parameters<RuleTester["run"]>[2],
  ) => void;
}

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;

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
