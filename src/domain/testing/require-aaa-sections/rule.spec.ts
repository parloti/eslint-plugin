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
  describe("metadata", () => {
    it("defines metadata and fix support", () => {
      // Arrange
      const fixable = requireAaaSectionsRule.meta?.fixable;

      // Act
      const actualMessages = requireAaaSectionsRule.meta?.messages;

      // Assert
      expect(fixable).toBe("code");
      expect(actualMessages).toHaveProperty("emptySection");
      expect(actualMessages).toHaveProperty("missingSections");
    });
  });

  describe("reporting empty sections", () => {
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
      expect(result.messages).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: "emptySection" }),
        ]),
      );
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
      expect(result.messages).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: "emptySection" }),
        ]),
      );
    });

    it("reports empty Act sections", () => {
      // Arrange
      const code = [
        'it("rejects empty act", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "",
        "  // Assert",
        "  expect(run(input)).toBe(1);",
        "});",
      ].join("\n");

      // Act
      const result = runFix(code);

      // Assert
      expect(result.messages).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: "emptySection" }),
        ]),
      );
    });

    it("reports empty Assert sections", () => {
      // Arrange
      const code = [
        'it("rejects empty assert", () => {',
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Assert",
        "});",
      ].join("\n");

      // Act
      const result = runFix(code);

      // Assert
      expect(result.messages).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: "emptySection" }),
        ]),
      );
    });
  });

  describe("section arrangement", () => {
    it("does not require Arrange when no statements precede the first section", () => {
      // Arrange
      const code = [
        'it("needs no arrange", () => {',
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
      expect(result.messages).toStrictEqual([]);
    });

    it("still requires Arrange when statements precede the first section", () => {
      // Arrange
      const code = [
        'it("arrange required when pre-section code exists", () => {',
        "  const input = 1;",
        "  // Act",
        "  const actualResult = run(input);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n");

      // Act
      const actualResult = runFix(code).fixed;

      // Assert
      expect(actualResult).toBe(true);
    });

    it("reports section comments that appear out of canonical order", () => {
      // Arrange
      const code = [
        'it("has reversed sections", () => {',
        "  // Act & Assert",
        "  expect(run()).toBe(1);",
        "",
        "  // Arrange",
        "  const input = 1;",
        "});",
      ].join("\n");

      // Act
      const result = runFix(code);

      // Assert
      expect(result.messages).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: "outOfOrderSection" }),
        ]),
      );
    });

    it("does not report blank line before a combined first section comment", () => {
      // Arrange
      const code = [
        'it("loads the module", () => {',
        "  // Arrange & Act & Assert",
        "  expect(types).toBeDefined();",
        "});",
      ].join("\n");

      // Act
      const result = runFix(code);

      // Assert
      expect(result.messages).not.toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ messageId: "blankLineBeforeSection" }),
        ]),
      );
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
  });

  describe("edge cases", () => {
    it("does not crash when a multi-line empty test body cannot place section comments", () => {
      // Arrange
      const code = ['it("is empty", () => {', "", "", "", "});"].join("\n");

      // Act
      const result = runFix(code);

      // Assert
      expect(result.fixed).toBe(false);
      expect(result.messages[0]?.messageId).toBe("missingSections");
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
  });
});
