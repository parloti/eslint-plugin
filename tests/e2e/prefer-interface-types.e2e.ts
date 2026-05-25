import { describe, expect, it } from "vitest";

import { preferInterfaceTypesRule } from "../../src";
import { runRuleCase } from "../support";

describe("prefer-interface-types e2e", () => {
  it("rejects inline object types in parameters and returns", () => {
    // Arrange
    const testCase = {
      code: [
        "function demo(input: { value: string }): { value: string } {",
        "  return input;",
        "}",
      ].join("\n"),
      errors: [
        { messageId: "preferNamedObject" },
        { messageId: "preferNamedObject" },
      ],
    };

    // Act
    const result = runRuleCase(
      "prefer-interface-types",
      preferInterfaceTypesRule,
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
        "interface DemoInput {",
        "  value: string;",
        "}",
        "",
        "function demo(input: DemoInput): DemoInput {",
        "  return input;",
        "}",
      ].join("\n"),
    },
    {
      code: [
        "type DemoInput = { value: string };",
        "",
        "const demo = (...values: DemoInput[]): DemoInput => values[0]!;",
      ].join("\n"),
    },
  ])("accepts named reusable object types %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "prefer-interface-types",
      preferInterfaceTypesRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
