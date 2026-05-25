import { describe, expect, it } from "vitest";

import { assertActualExpectedNamesRule } from "../../src";
import { runRuleCase } from "../support";

describe("assert-actual-expected-names e2e", () => {
  it("rejects names without actual and expected prefixes", () => {
    // Arrange
    const testCase = {
      code: [
        'it("uses clear assert names", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const computedResult = run(input);",
        "",
        "  // Assert",
        "  const result = computedResult;",
        "  const value = 1;",
        "  expect(result).toBe(value);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "assert-actual-expected-names",
      assertActualExpectedNamesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(["missingPrefix", "missingPrefix"]);
  });

  it("accepts actualResult and expectedValue names", () => {
    // Arrange
    const testCase = {
      code: [
        'it("uses actual and expected prefixes", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const computedResult = run(input);",
        "",
        "  // Assert",
        "  const actualResult = computedResult;",
        "  const expectedValue = 1;",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "assert-actual-expected-names",
      assertActualExpectedNamesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("accepts short actual and expected names", () => {
    // Arrange
    const testCase = {
      code: [
        'it("uses actual and expected prefixes", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const computedResult = run(input);",
        "",
        "  // Assert",
        "  const actual = computedResult;",
        "  const expected = 1;",
        "  expect(actual).toBe(expected);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "assert-actual-expected-names",
      assertActualExpectedNamesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("accepts direct actual names created in Act", () => {
    // Arrange
    const testCase = {
      code: [
        'it("uses actual and expected prefixes", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actual = run(input);",
        "",
        "  // Assert",
        "  const expected = 1;",
        "  expect(actual).toBe(expected);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "assert-actual-expected-names",
      assertActualExpectedNamesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
