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
    expect(result.diagnostics).toStrictEqual([
      {
        column: 3,
        line: 7,
        messageId: "multipleActStatements",
        nodeType: void 0,
      },
    ]);
  });

  it("rejects multiple non-expression Act statements", () => {
    // Arrange
    const testCase = {
      code: [
        'it("rejects multi-statement control flow", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  if (input > 0) {",
        "    run(input);",
        "  }",
        "  return;",
        "",
        "  // Assert",
        "  expect(input).toBe(1);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "multipleActStatements" }],
      filename: "example.spec.ts",
      languageOptions: {
        parserOptions: { ecmaFeatures: { globalReturn: true } },
      },
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
    expect(result.diagnostics).toStrictEqual([
      {
        column: 3,
        line: 9,
        messageId: "multipleActStatements",
        nodeType: void 0,
      },
    ]);
  });

  it("does not count Act statements that are also in Assert", () => {
    // Arrange
    const testCase = {
      code: [
        'it("allows Act & Assert section", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act & Assert",
        "  expect(run(input)).toBe(1);",
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
