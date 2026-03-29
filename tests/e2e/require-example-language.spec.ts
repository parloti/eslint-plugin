import { describe, expect, it } from "vitest";

import { requireExampleLanguageRule } from "../../src";
import { runRuleCase } from "../support";

describe("require-example-language e2e", () => {
  it.each([
    {
      code: [
        "/**",
        " * @example const value = 1;",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
      errors: [{ messageId: "missingFence" }],
      output: [
        "/**",
        " * @example",
        " * ```typescript",
        " *  const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
    },
    {
      code: [
        "/**",
        " * @example",
        " * ```",
        " * const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
      errors: [{ messageId: "missingLanguage" }],
      output: [
        "/**",
        " * @example",
        " * ```typescript",
        " * const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
    },
  ])("adds missing example fence metadata %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "require-example-language",
      requireExampleLanguageRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
    expect(result.output).toBe(testCase.output);
  });

  it("accepts fenced examples with an explicit language", () => {
    // Arrange
    const testCase = {
      code: [
        "/**",
        " * @example",
        " * ```typescript",
        " * const value = 1;",
        " * ```",
        " */",
        "export function demo(): void {}",
      ].join("\n"),
    };

    // Act
    const result = runRuleCase(
      "require-example-language",
      requireExampleLanguageRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
