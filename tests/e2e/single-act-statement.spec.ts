import { describe, expect, it } from "vitest";

import { singleActStatementRule } from "../../src";
import { runRuleCase } from "../support";

describe("single-act-statement e2e", () => {
  it("rejects multiple Act statements", () => {
    // Arrange
    const testCase = {
      code: [
        'it("keeps one act statement", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "  cleanup(actualResult);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "multipleActStatements" }],
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "single-act-statement",
      singleActStatementRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it("accepts one Act declaration", () => {
    // Arrange
    const testCase = {
      code: [
        'it("allows one act declaration", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "single-act-statement",
      singleActStatementRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
