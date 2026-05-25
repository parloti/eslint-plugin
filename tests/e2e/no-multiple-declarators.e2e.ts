import { describe, expect, it } from "vitest";

import { noMultipleDeclaratorsRule } from "../../src";
import { runRuleCase } from "../support";

describe("no-multiple-declarators e2e", () => {
  it("fixes multiple declarators in one statement", () => {
    // Arrange
    const testCase = {
      code: [
        "const availableRules = new Set(Object.keys(rules ?? {})),",
        "  customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
      errors: [{ messageId: "singleDeclarator" }],
      output: [
        "const availableRules = new Set(Object.keys(rules ?? {}));",
        "const customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
    };

    // Act
    const result = runRuleCase(
      "no-multiple-declarators",
      noMultipleDeclaratorsRule,
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
      code: [
        "export const availableRules = new Set(Object.keys(rules ?? {})),",
        "  customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
      errors: [{ messageId: "singleDeclarator" }],
    },
    {
      code: [
        "const availableRules = new Set(Object.keys(rules ?? {})),",
        "  /* keep */ customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
      errors: [{ messageId: "singleDeclarator" }],
    },
  ])("rejects multiple declarators %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "no-multiple-declarators",
      noMultipleDeclaratorsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it("accepts a single declarator per statement", () => {
    // Arrange
    const testCase = {
      code: [
        "const availableRules = new Set(Object.keys(rules ?? {}));",
        "const customError = buildCustomErrorRules(availableRules);",
      ].join("\n"),
    };

    // Act
    const result = runRuleCase(
      "no-multiple-declarators",
      noMultipleDeclaratorsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
