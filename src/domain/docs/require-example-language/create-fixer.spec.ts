import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Example } from "./types";

import { createFixerCompanion } from "./create-fixer";
import { createFixer } from "./fixes";

/**
 * Creates a minimal rule fixer for createFixer tests.
 * @returns Rule fixer stub.
 * @example
 * ```typescript
 * const fixer = createRuleTextEditor();
 * ```
 */
const createRuleTextEditor = (): Rule.RuleFixer => {
  const buildFix = (text = ""): Rule.Fix => ({ range: [0, 0], text });

  return {
    insertTextAfter: () => buildFix(),
    insertTextAfterRange: () => buildFix(),
    insertTextBefore: () => buildFix(),
    insertTextBeforeRange: () => buildFix(),
    remove: () => buildFix(),
    removeRange: () => buildFix(),
    replaceText: () => buildFix(),
    replaceTextRange: (_range, text) => buildFix(text),
  };
};

describe("require-example-language createFixer", () => {
  it("exports the createFixer companion module", () => {
    // Arrange
    const expected = createFixer;

    // Act
    const actual = createFixerCompanion;

    // Assert
    expect(actual).toBe(expected);
  });

  it("returns undefined when a missing-language fix is unnecessary", () => {
    // Arrange
    const example: Example = {
      content: "",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText = "* ```typescript\n* ok\n* ```";

    // Act
    const fixResult = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "missingLanguage",
      sourceText,
    })(createRuleTextEditor());

    // Assert
    expect(fixResult).toBeUndefined();
  });

  it("removes empty examples when other examples exist", () => {
    // Arrange
    const example: Example = {
      content: "",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText = "* @example\n* @example\n* ok";

    // Act
    const fixResult = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: true,
      problem: "emptyExample",
      sourceText,
    })(createRuleTextEditor());

    // Assert
    expect(fixResult?.text).toBe("");
  });

  it("skips fixes for fenced empty examples when alone", () => {
    // Arrange
    const example: Example = {
      content: "```typescript\n```",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText = "* @example\n* ```typescript\n* ```";

    // Act
    const fixResult = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "emptyExample",
      sourceText,
    })(createRuleTextEditor());

    // Assert
    expect(fixResult).toBeUndefined();
  });

  it("builds a fence fix for empty examples without fences", () => {
    // Arrange
    const example: Example = {
      content: "",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText = "* @example";

    // Act
    const fixResult = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "emptyExample",
      sourceText,
    })(createRuleTextEditor());

    // Assert
    expect(fixResult?.text).toContain("```typescript");
  });

  it("removes empty fences when a non-empty fence exists", () => {
    // Arrange
    const example: Example = {
      content: "```typescript\n```\n```typescript\nconst ok = true;\n```",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText =
      "* @example\n* ```typescript\n* ```\n* ```typescript\n* const ok = true;\n* ```";
    const fixer = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "emptyExample",
      sourceText,
    });
    const emptyFenceSequence = "* ```typescript\n* ```\n* ```typescript";

    // Act
    const fixResult = fixer(createRuleTextEditor());

    // Assert
    expect(fixResult?.text).not.toContain(emptyFenceSequence);
    expect(fixResult?.text).toContain("const ok = true");
  });

  it("preserves trailing whitespace for comment closure placement", () => {
    // Arrange
    const example: Example = {
      content: 'Demonstrates log info with representative values.\n * logInfo("message");',
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText =
      '* @example Demonstrates log info with representative values.\n * logInfo("message");\n ';

    // Act
    const text = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "missingFence",
      sourceText,
    })(createRuleTextEditor())?.text;

    // Assert
    expect(text).toMatch(/\n $/u);
  });

  it("does not append trailing whitespace when none exists", () => {
    // Arrange
    const example: Example = {
      content: 'Demonstrates log info with representative values.\n * logInfo("message");',
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };
    const sourceText =
      '* @example Demonstrates log info with representative values.\n * logInfo("message");';
    const fixer = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "missingFence",
      sourceText,
    });

    // Act
    const text = fixer(createRuleTextEditor())?.text;

    // Assert
    expect(text).not.toMatch(/\n $/u);
    expect(text).toContain("```typescript");
  });
});