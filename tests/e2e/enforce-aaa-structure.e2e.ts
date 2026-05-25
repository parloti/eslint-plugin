import { describe, expect, it } from "vitest";

import { enforceAaaStructureRule } from "../../src";
import { runRuleCase } from "../support";

describe("enforce-aaa-structure e2e", () => {
  it.each([
    {
      code: [
        'it("orders AAA phases", () => {',
        "  // Act",
        "  const actualResult = run();",
        "",
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(input);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "invalidOrder" }],
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("avoids duplicate act sections", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Act",
        "  const nextResult = rerun(actualResult);",
        "",
        "  // Assert",
        "  expect(nextResult).toBe(2);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "duplicateSection" }],
      filename: "example.spec.ts",
    },
  ])("rejects invalid AAA ordering %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "enforce-aaa-structure",
      enforceAaaStructureRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it("accepts a single AAA flow", () => {
    // Arrange
    const testCase = {
      code: [
        'it.only("keeps a single AAA flow", () => {',
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
      "enforce-aaa-structure",
      enforceAaaStructureRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
