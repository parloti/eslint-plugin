import type { Rule, SourceCode } from "eslint";

import { describe, expect, expectTypeOf, it } from "vitest";

import { requireExampleLanguageRule } from "./rule";

describe("require example language rule", () => {
  it("exposes metadata", () => {
    expect(requireExampleLanguageRule.meta?.type).toBe("problem");

    expectTypeOf(requireExampleLanguageRule.create).toBeFunction();
  });

  it("ignores non-block or non-jsdoc comments", () => {
    let reportCalls = 0;
    const report = ((): void => {
      reportCalls += 1;
    }) as Rule.RuleContext["report"];

    const sourceCode = {
      getAllComments: () => [
        { type: "Line", value: " @example" },
        { type: "Block", value: " Not jsdoc" },
      ],
    } as SourceCode;

    const context = {
      report,
      sourceCode,
    } as Rule.RuleContext;

    requireExampleLanguageRule.create(context);

    expect(reportCalls).toBe(0);
  });
});
