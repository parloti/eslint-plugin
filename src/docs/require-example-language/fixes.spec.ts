import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Example } from "./types";

import {
  buildMissingFenceFix,
  buildMissingLanguageFix,
  createFixer,
} from "./fixes";

/**
 * Creates createRuleTextEditor.
 * @returns Return value output.
 * @example
 * ```typescript
 * createRuleTextEditor();
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

describe("require-example-language fixes", () => {
  it("builds missing fence fixes with blank lines", () => {
    // Arrange
    const example: Example = {
      content: "first\n\nsecond",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };

    // Act
    const fixed = buildMissingFenceFix(example);

    // Assert
    expect(fixed).toContain("\n * \n");
    expect(fixed).toContain("```typescript");
  });

  it("builds missing fence fixes when content is empty", () => {
    // Arrange
    const example: Example = {
      content: "",
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };

    // Act
    const fixed = buildMissingFenceFix(example);

    // Assert
    expect(fixed).toContain("```typescript");
  });

  it("adds language to CRLF fences", () => {
    // Arrange
    const original = "* ```\r\n* ok\r\n* ```";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toContain("```typescript");
    expect(updated).toContain("\r\n");
  });

  it("handles fences without leading whitespace", () => {
    // Arrange
    const original = "```\nconsole.log('ok');\n```";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toContain("```typescript");
  });

  it("returns undefined when fences already include language", () => {
    // Arrange
    const original = "* ```typescript\n* ok\n* ```";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toBeUndefined();
  });

  it("returns undefined when no fences are present", () => {
    // Arrange
    const original = "* no fences here";

    // Act
    const updated = buildMissingLanguageFix(original);

    // Assert
    expect(updated).toBeUndefined();
  });

  it("normalizes inline and prefixed lines for missing fences", () => {
    // Arrange
    const example: Example = {
      content: 'Demonstrates log info with representative values.\n * logInfo("message");',
      endIndex: 0,
      endOffset: 0,
      lineIndex: 0,
      prefix: " * ",
      startOffset: 0,
    };

    // Act
    const actualFixed = buildMissingFenceFix(example);

    // Assert
    expect(actualFixed).toContain(
      "\n *  Demonstrates log info with representative values.",
    );
    expect(actualFixed).toContain('\n *  logInfo("message");');
    expect(actualFixed).not.toContain("\n *   * logInfo");
  });
});

describe("require-example-language empty examples", () => {
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
    expect(fixResult).toBeNull();
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
    expect(fixResult).toBeNull();
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
    const fixResult = createFixer({
      absoluteEnd: sourceText.length,
      absoluteStart: 0,
      example,
      hasOtherExamples: false,
      problem: "missingFence",
      sourceText,
    })(createRuleTextEditor());

    // Assert
    expect(fixResult?.text.endsWith("\n ")).toBe(true);
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
    const fixResult = fixer(createRuleTextEditor());

    // Assert
    expect(fixResult?.text.endsWith("\n ")).toBe(false);
    expect(fixResult?.text).toContain("```typescript");
  });
});
