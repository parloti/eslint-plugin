import { describe, expect, it } from "vitest";

import { singleLineJsdocRule } from "../../src";
import { runRuleCase } from "../support";

describe("single-line-jsdoc e2e", () => {
  it("collapses simple JSDoc blocks onto one line", () => {
    // Arrange
    const testCase = {
      code: ["/**", " * doc", " */", "const value = 1;"].join("\n"),
      errors: [{ messageId: "singleLine" }],
      output: ["/** doc */", "const value = 1;"].join("\n"),
    };

    // Act
    const result = runRuleCase(
      "single-line-jsdoc",
      singleLineJsdocRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
    expect(result.output).toBe(testCase.output);
  });

  it.each([
    {
      code: ["/** doc */", "const value = 1;"].join("\n"),
    },
    {
      code: [
        "/**",
        " * @param value Input value.",
        " */",
        "function demo(value: string): string {",
        "  return value;",
        "}",
      ].join("\n"),
    },
  ])("accepts already-compliant JSDoc forms %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "single-line-jsdoc",
      singleLineJsdocRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
