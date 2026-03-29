import { describe, expect, it } from "vitest";

import { requireAaaSectionsRule } from "../../src";
import { runRuleCase } from "../support";

describe("require-aaa-sections e2e", () => {
  it.each([
    {
      code: [
        'it("captures the result", () => {',
        "  const input = 1;",
        "  const actualResult = run(input);",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "missingSections" }],
      filename: "example.spec.ts",
      output: [
        'it("captures the result", () => {',
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
    },
    {
      code: [
        'it("separates phases", () => {',
        "  // Arrange",
        "  const input = 1;",
        "  // Act",
        "  const actualResult = run(input);",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      errors: [
        { messageId: "blankLineBeforeSection" },
        { messageId: "blankLineBeforeSection" },
      ],
      filename: "example.spec.ts",
      output: [
        'it("separates phases", () => {',
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
    },
  ])("fixes incomplete AAA section layouts %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "require-aaa-sections",
      requireAaaSectionsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
    expect(result.output).toBe(testCase.output);
  });

  it("rejects code that appears before Arrange", () => {
    // Arrange
    const testCase = {
      code: [
        'it("starts with arrange", () => {',
        "  const input = 1;",
        "  // Arrange",
        "  const actualResult = run(input);",
        "",
        "  // Act",
        "  const nextResult = rerun(actualResult);",
        "",
        "  // Assert",
        "  expect(nextResult).toBe(2);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "codeBeforeArrange" }],
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "require-aaa-sections",
      requireAaaSectionsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it.each([
    {
      code: [
        'test("uses AAA comments", () => {',
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
    },
    {
      code: [
        'it("accepts combined AAA comments", () => {',
        "",
        "  // Arrange & Act & Assert",
        "  expect(run()).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ])("accepts complete AAA section layouts %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "require-aaa-sections",
      requireAaaSectionsRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
