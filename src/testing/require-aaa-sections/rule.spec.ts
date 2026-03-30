import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { requireAaaSectionsRule } from "./rule";

/**
 * Runs the rule with autofix enabled for a single source snippet.
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
              "require-aaa-sections": requireAaaSectionsRule,
            },
          },
        },
        rules: {
          "codeperfect/require-aaa-sections": "error",
        },
      },
    ],
    { filename: "example.spec.ts" },
  );
}

describe("require-aaa-sections rule", () => {
  it("defines metadata and fix support", () => {
    // Arrange
    const fixable = requireAaaSectionsRule.meta?.fixable;

    // Act
    const messages = requireAaaSectionsRule.meta?.messages;

    // Assert
    expect(fixable).toBe("code");
    expect(messages).toHaveProperty("emptySection");
    expect(messages).toHaveProperty("missingSections");
  });

  it("reports comment-only Arrange sections without autofixing them", () => {
    // Arrange
    const code = [
      'it("rejects comment-only arrange", () => {',
      "  // Arrange",
      "  // no setup required",
      "",
      "  // Act",
      "  const actualResult = run();",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runFix(code);

    // Assert
    expect(result.fixed).toBe(false);
    expect(result.messages.map((message) => message.messageId)).toContain(
      "emptySection",
    );
  });

  it("does not crash when a multi-line empty test body cannot place section comments", () => {
    // Arrange
    const code = ['it("is empty", () => {', "", "", "", "});"].join("\n");

    // Act
    const result = runFix(code);

    // Assert
    expect(result.fixed).toBe(false);
    expect(result.messages[0]?.messageId).toBe("missingSections");
  });

  it("combines missing section comments when one statement must represent multiple boundaries", () => {
    // Arrange
    const code = [
      'it("combines boundaries", () => {',
      "  // Arrange",
      "",
      "  expect(run()).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runFix(code);

    // Assert
    expect(result.output).toContain("// Act & Assert");
  });

  it("does not offer a fix when the body is too short", () => {
    // Arrange
    const code = [
      'it("stays report-only for short bodies", () => {',
      "  run();",
      "});",
    ].join("\n");

    // Act
    const result = runFix(code);

    // Assert
    expect(result.fixed).toBe(false);
    expect(result.messages[0]?.messageId).toBe("missingSections");
  });

  it("reports whitespace-only Arrange sections", () => {
    // Arrange
    const code = [
      'it("rejects whitespace-only arrange", () => {',
      "  // Arrange",
      "",
      "",
      "  // Act",
      "  const actualResult = run();",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runFix(code);

    // Assert
    expect(result.messages.map((message) => message.messageId)).toContain(
      "emptySection",
    );
  });
});
