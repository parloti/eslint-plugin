import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { enforceAaaStructureRule } from "./rule";

/**
 * Runs the merged rule with autofix enabled for a single source snippet.
 * @param code Source text passed to the linter.
 * @returns ESLint verify-and-fix result for the snippet.
 * @example
 * ```typescript
 * const result = runFix('it("works", () => {});');
 * void result;
 * ```
 */
function runFix(code: string): ReturnType<Linter["verifyAndFix"]> {
  const linter = new Linter({ configType: "flat" });

  return linter.verifyAndFix(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: {
          ecmaVersion: 2022,
          parser,
          sourceType: "module",
        },
        plugins: {
          codeperfect: {
            rules: {
              "enforce-aaa-structure": enforceAaaStructureRule,
            },
          },
        },
        rules: {
          "codeperfect/enforce-aaa-structure": "error",
        },
      },
    ],
    { filename: "example.spec.ts" },
  );
}

describe("enforce-aaa-structure rule", () => {
  it("defines metadata, messages, and fix support", () => {
    // Arrange
    const fixable = enforceAaaStructureRule.meta?.fixable;
    const expectedMessageIds = [
      "duplicateSection",
      "invalidOrder",
      "missingSections",
      "emptySection",
      "assertionOutsideAssert",
    ];

    // Act
    const actualMessages = enforceAaaStructureRule.meta?.messages;

    // Assert
    expect(fixable).toBe("code");
    expect(actualMessages).toStrictEqual(
      expect.objectContaining(
        Object.fromEntries(
          expectedMessageIds.map((messageId) => [
            messageId,
            expect.any(String),
          ]),
        ),
      ),
    );
  });

  it("reports duplicate and out-of-order sections", () => {
    // Arrange
    const code = [
      'it("orders AAA phases", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Assert",
      "  expect(run(input)).toBe(1);",
      "",
      "  // Arrange",
      "  const nextInput = 2;",
      "",
      "  // Act",
      "  const actualResult = run(nextInput);",
      "});",
    ].join("\n");

    // Act
    const actualMessageIds = runFix(code).messages.map(
      (message) => message.messageId,
    );

    // Assert
    expect(actualMessageIds).toContain("duplicateSection");
    expect(actualMessageIds).toContain("invalidOrder");
    expect(actualMessageIds).toContain("outOfOrderSection");
  });

  it("autofixes missing section markers and spacing", () => {
    // Arrange
    const code = [
      'it("captures the result", () => {',
      "  const input = 1;",
      "  const actualResult = run(input);",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runFix(code);

    // Assert
    expect(result.messages).toStrictEqual([]);
    expect(result.output).toBe(
      [
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
    );
  });

  it("reports purity violations while keeping message IDs distinct", () => {
    // Arrange
    const code = [
      'it("keeps assertions in assert", () => {',
      "  // Arrange",
      "  const expectedValue = 1;",
      "",
      "  // Act",
      "  expect(run()).toBe(expectedValue);",
      "",
      "  // Assert",
      "  const actualResult = 1;",
      "  expect(actualResult).toBe(expectedValue);",
      "});",
    ].join("\n");

    // Act
    const actualMessageIds = runFix(code).messages.map(
      (message) => message.messageId,
    );

    // Assert
    expect(actualMessageIds).toStrictEqual(["assertionOutsideAssert"]);
  });

  it("reports code before Arrange", () => {
    // Arrange
    const code = [
      'it("starts with arrange", () => {',
      "  const input = 1;",
      "  // Arrange",
      "  const fixture = input + 1;",
      "",
      "  // Act",
      "  const nextResult = rerun(fixture);",
      "",
      "  // Assert",
      "  expect(nextResult).toBe(2);",
      "});",
    ].join("\n");

    // Act
    const actualMessageIds = runFix(code).messages.map(
      (message) => message.messageId,
    );

    // Assert
    expect(actualMessageIds).toContain("codeBeforeArrange");
  });
});
