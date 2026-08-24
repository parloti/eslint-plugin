import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Example } from "./types";

import { createFixer } from "./fixes";

/** Supported problem identifiers used by this test suite. */
interface ApplyFixInput {
  /** Parsed example metadata. */
  example: Example;
  /** Whether the comment contains additional examples. */
  hasOtherExamples?: boolean;
  /** Problem code that determines which fix branch runs. */
  problem:
    "contentOutsideFence" | "emptyExample" | "missingFence" | "missingLanguage";
  /** Original source text segment to patch. */
  sourceText: string;
}

/**
 * Creates an Example fixture positioned at the origin.
 * @param content Example content value.
 * @param prefix Comment prefix preceding the example.
 * @returns Example fixture with zeroed offsets.
 * @example
 * ```typescript
 * const example = createExample("value", " * ");
 * ```
 */
const createExample = (content: string, prefix: string): Example => ({
  content,
  endIndex: 0,
  endOffset: 0,
  lineIndex: 0,
  prefix,
  startOffset: 0,
});

/**
 * Applies a createFixer callback and returns the replacement text.
 * @param context Fixture context used to build the fix callback.
 * @returns Replacement text emitted by the fixer when available.
 * @example
 * ```typescript
 * const text = applyFix({
 *   example: {
 *     content: "value",
 *     endIndex: 0,
 *     endOffset: 0,
 *     lineIndex: 0,
 *     prefix: " * ",
 *     startOffset: 0,
 *   },
 *   problem: "missingFence",
 *   sourceText: "* @example value",
 * });
 * void text;
 * ```
 */
const applyFix = (context: ApplyFixInput): string | undefined => {
  const fixer: Rule.RuleFixer = {
    insertTextAfter: () => ({ range: [0, 0], text: "" }),
    insertTextAfterRange: () => ({ range: [0, 0], text: "" }),
    insertTextBefore: () => ({ range: [0, 0], text: "" }),
    insertTextBeforeRange: () => ({ range: [0, 0], text: "" }),
    remove: () => ({ range: [0, 0], text: "" }),
    removeRange: () => ({ range: [0, 0], text: "" }),
    replaceText: () => ({ range: [0, 0], text: "" }),
    replaceTextRange: (_range, text) => ({ range: [0, 0], text }),
  };

  const actualFixResult = createFixer({
    absoluteEnd: context.sourceText.length,
    absoluteStart: 0,
    example: context.example,
    hasOtherExamples: context.hasOtherExamples ?? false,
    problem: context.problem,
    sourceText: context.sourceText,
  })(fixer);

  return actualFixResult?.text;
};

describe("require-example-language fixes", () => {
  it("builds missing fence fixes with blank lines", () => {
    // Arrange
    const example = createExample("first\n\nsecond", " * ");

    // Act
    const actualFixed = applyFix({
      example,
      problem: "missingFence",
      sourceText: "* @example first\n * second",
    });

    // Assert
    expect(actualFixed).toContain("\n * \n");
    expect(actualFixed).toContain("```typescript");
  });

  it("builds missing fence fixes when content is empty", () => {
    // Arrange
    const example = createExample("", " * ");

    // Act
    const actualFixed = applyFix({
      example,
      problem: "missingFence",
      sourceText: "* @example",
    });

    // Assert
    expect(actualFixed).toContain("```typescript");
  });

  it("adds language to CRLF fences", () => {
    // Arrange
    const original = "* ```\r\n* ok\r\n* ```";

    // Act
    const actualUpdated = applyFix({
      example: createExample("", "* "),
      problem: "missingLanguage",
      sourceText: original,
    });

    // Assert
    expect(actualUpdated).toContain("```typescript");
    expect(actualUpdated).toContain("\r\n");
  });

  it("handles fences without leading whitespace", () => {
    // Arrange
    const original = "```\nconsole.log('ok');\n```";

    // Act
    const actualUpdated = applyFix({
      example: createExample("", ""),
      problem: "missingLanguage",
      sourceText: original,
    });

    // Assert
    expect(actualUpdated).toContain("```typescript");
  });

  it("returns undefined when fences already include language", () => {
    // Arrange
    const original = "* ```typescript\n* ok\n* ```";

    // Act
    const actualUpdated = applyFix({
      example: createExample("", "* "),
      problem: "missingLanguage",
      sourceText: original,
    });

    // Assert
    expect(actualUpdated).toBeUndefined();
  });

  it("returns undefined when no fences are present", () => {
    // Arrange
    const original = "* no fences here";

    // Act
    const actualUpdated = applyFix({
      example: createExample("", "* "),
      problem: "missingLanguage",
      sourceText: original,
    });

    // Assert
    expect(actualUpdated).toBeUndefined();
  });

  it("normalizes inline and prefixed lines for missing fences", () => {
    // Arrange
    const example = createExample(
      'Demonstrates log info with representative values.\n * logInfo("message");',
      " * ",
    );

    // Act
    const actualFixed = applyFix({
      example,
      problem: "missingFence",
      sourceText: "* @example",
    });

    // Assert
    expect(actualFixed).toContain(
      "\n *  Demonstrates log info with representative values.",
    );
    expect(actualFixed).toContain('\n *  logInfo("message");');
    expect(actualFixed).not.toContain("\n *   * logInfo");
  });

  it("returns undefined for contentOutsideFence problems", () => {
    // Arrange
    const sourceText = "```typescript\nvalue\n```\nextra";

    // Act
    const actualFixed = applyFix({
      example: createExample(sourceText, ""),
      problem: "contentOutsideFence",
      sourceText,
    });

    // Assert
    expect(actualFixed).toBeUndefined();
  });

  it("removes empty examples when other examples exist", () => {
    // Arrange
    const sourceText = "* @example";

    // Act
    const actualFixed = applyFix({
      example: createExample("", "* "),
      hasOtherExamples: true,
      problem: "emptyExample",
      sourceText,
    });

    // Assert
    expect(actualFixed).toBe("");
  });

  it("preserves trailing whitespace for missing fence fixes", () => {
    // Arrange
    const sourceText = "* @example value\n   ";

    // Act
    const actualHasTrailingWhitespace = applyFix({
      example: createExample("value", "* "),
      problem: "missingFence",
      sourceText,
    })?.endsWith("\n   ");

    // Assert
    expect(actualHasTrailingWhitespace).toBe(true);
  });

  it("returns undefined for empty examples that already have fences", () => {
    // Arrange
    const sourceText = "* ```\n* ```";

    // Act
    const actualFixed = applyFix({
      example: createExample("", "* "),
      problem: "emptyExample",
      sourceText,
    });

    // Assert
    expect(actualFixed).toBeUndefined();
  });
});
