import type { Rule, SourceCode } from "eslint";

import { describe, expect, expectTypeOf, it } from "vitest";

import { requireExampleLanguageRule } from "./rule";

describe("require example language rule", () => {
  it("exposes metadata", () => {
    // Arrange
    const ruleType = requireExampleLanguageRule.meta?.type;

    // Act
    const createType = typeof requireExampleLanguageRule.create;

    // Assert
    expect(ruleType).toBe("problem");
    expect(createType).toBe("function");
  });

  it("ignores non-block or non-jsdoc comments", () => {
    // Arrange
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

    // Act
    requireExampleLanguageRule.create({
      report,
      sourceCode,
    } as Rule.RuleContext);

    // Assert
    expect(reportCalls).toBe(0);
  });
});
