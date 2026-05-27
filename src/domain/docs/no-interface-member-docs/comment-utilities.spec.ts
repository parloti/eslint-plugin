import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Comment } from "../../../shared/test-utils/no-interface-member-documentation-comment-utilities-test-helpers";

import {
  createComment,
  createDualJsdocContext,
  createNonJsdocContext,
  createRangeMissingContext,
  createSingleJsdocContext,
  createSourceCode,
} from "../../../shared/test-utils/no-interface-member-documentation-comment-utilities-test-helpers";
import {
  buildRemovalRange,
  getCommentLines,
  getCommentText,
  getJsdocComment,
} from "./comment-utilities";

describe("comment utilities jsdoc lookup", () => {
  it("finds the closest JSDoc comment", () => {
    // Arrange
    const { comment, node, sourceCode } = createSingleJsdocContext();

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBe(comment);
  });

  it("skips when no comments exist", () => {
    // Arrange
    const sourceText = "function demo() {}";
    const sourceCode = createSourceCode(sourceText, []);
    const node = {
      range: [0, sourceText.length],
      type: "FunctionDeclaration",
    } as Rule.Node;

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("prefers the closest JSDoc comment", () => {
    // Arrange
    const { node, second, sourceCode } = createDualJsdocContext();

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBe(second);
  });

  it("ignores non-jsdoc comments", () => {
    // Arrange
    const { node, sourceCode } = createNonJsdocContext();

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("skips comments without ranges", () => {
    // Arrange
    const { node, sourceCode } = createRangeMissingContext();

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("skips comments whose end range is missing", () => {
    // Arrange
    const sourceText =
      "/**\n * ok\n */\nfunction demo(context: LineMetaContext): void {}";
    const comment = {
      range: [0, void 0 as unknown as number],
      type: "Block",
      value: "*\n * ok\n ",
    } as Comment;
    const sourceCode = createSourceCode(sourceText, [comment]);
    const node = {
      range: [sourceText.indexOf("function"), sourceText.length],
      type: "FunctionDeclaration",
    } as Rule.Node;

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("skips JSDoc comments when non-whitespace text appears before the node", () => {
    // Arrange
    const sourceText =
      "/**\n * ok\n */\nconst marker = 1;\nfunction demo(context: LineMetaContext): void {}";
    const comment = createComment("*\n * ok\n ", [
      0,
      sourceText.indexOf("*/") + 2,
    ]);
    const sourceCode = createSourceCode(sourceText, [comment]);
    const node = {
      range: [sourceText.indexOf("function"), sourceText.length],
      type: "FunctionDeclaration",
    } as Rule.Node;

    // Act
    const actual = getJsdocComment(sourceCode, node);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("returns undefined when a selected comment no longer exposes a numeric end", () => {
    // Arrange
    const sourceText = "/**\n * ok\n */\nfunction demo(): void {}";
    const stableEnd = sourceText.indexOf("*/") + 2;
    const comment = createComment("*\n * ok\n ", [0, stableEnd]);
    let readCount = 0;
    const node = {
      range: [sourceText.indexOf("function"), sourceText.length],
      type: "FunctionDeclaration",
    } as Rule.Node;

    // Act
    const actual = (() => {
      Object.defineProperty(comment, "range", {
        configurable: true,
        get: () => {
          readCount += 1;

          return readCount === 1 ? [0, stableEnd] : [0, void 0];
        },
      });

      const sourceCode = createSourceCode(sourceText, [comment]);

      return getJsdocComment(sourceCode, node);
    })();

    // Assert
    expect(actual).toBeUndefined();
  });
});

describe("comment utilities removal ranges", () => {
  it("builds removal ranges for comment lines", () => {
    // Arrange
    const commentText = "first\nsecond";
    const firstLine = getCommentLines(commentText)[0] ?? {
      end: 0,
      lineBreakLength: 0,
      start: 0,
      text: "",
    };

    // Act
    const range = buildRemovalRange(0, commentText, firstLine);

    // Assert
    expect(range[1]).toBeGreaterThan(range[0]);
  });

  it("handles comment lines without line breaks", () => {
    // Arrange
    const lines = getCommentLines("single");

    // Act
    const actualFirstLineBreakLength = lines[0]?.lineBreakLength;

    // Assert
    expect(lines).toHaveLength(1);
    expect(actualFirstLineBreakLength).toBe(0);
  });

  it("handles comment lines with CRLF line breaks", () => {
    // Arrange
    const lines = getCommentLines("first\r\nsecond");

    // Act
    const actualLineBreakLengths = lines.map((line) => line.lineBreakLength);

    // Assert
    expect(lines).toHaveLength(2);
    expect(actualLineBreakLengths).toStrictEqual([2, 0]);
  });

  it("handles removal ranges without a line break", () => {
    // Arrange
    const commentText = "first\nsecond";
    const line = {
      end: 12,
      lineBreakLength: 0,
      start: 6,
      text: "second",
    };

    // Act
    const range = buildRemovalRange(0, commentText, line);

    // Assert
    expect(range[0]).toBe(5);
    expect(range[1]).toBeGreaterThan(range[0]);
  });

  it("handles removal ranges with CRLF line breaks", () => {
    // Arrange
    const commentText = "first\r\nsecond";
    const line = {
      end: 13,
      lineBreakLength: 0,
      start: 7,
      text: "second",
    };

    // Act
    const actualRange = buildRemovalRange(0, commentText, line);

    // Assert
    expect(actualRange).toStrictEqual([5, 13]);
  });

  it("handles removal ranges without a prior line break", () => {
    // Arrange
    const commentText = "first second";
    const line = {
      end: 12,
      lineBreakLength: 0,
      start: 6,
      text: "second",
    };

    // Act
    const actualRange = buildRemovalRange(0, commentText, line);

    // Assert
    expect(actualRange).toStrictEqual([6, 12]);
  });

  it("handles removal ranges at the start of text", () => {
    // Arrange
    const commentText = "abc";
    const line = {
      end: 3,
      lineBreakLength: 0,
      start: 0,
      text: "abc",
    };

    // Act
    const actualRange = buildRemovalRange(0, commentText, line);

    // Assert
    expect(actualRange).toStrictEqual([0, 3]);
  });
});

describe("comment utilities text", () => {
  it("extracts comment text from the source", () => {
    // Arrange
    const sourceText = "/**\n * ok\n */\nfunction demo() {}";
    const comment = createComment("*\n * ok\n ", [
      0,
      sourceText.indexOf("*/") + 2,
    ]);

    // Act
    const actualText = getCommentText(
      createSourceCode(sourceText, [comment]),
      comment,
    );

    // Assert
    expect(actualText).toContain("ok");
  });

  it("returns an empty string when comment range is missing", () => {
    // Arrange
    const sourceText = "/**\n * ok\n */\nfunction demo() {}";
    const comment = {
      type: "Block",
      value: "*\n * ok\n ",
    } as Comment;
    const sourceCode = createSourceCode(sourceText, [comment]);

    // Act
    const actual = getCommentText(sourceCode, comment);

    // Assert
    expect(actual).toBe("");
  });
});
