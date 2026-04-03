import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Comment } from "./comment-utilities-test-helpers";

import {
  buildRemovalRange,
  getCommentLines,
  getCommentText,
  getJsdocComment,
} from "./comment-utilities";
import {
  createComment,
  createDualJsdocContext,
  createNonJsdocContext,
  createRangeMissingContext,
  createSingleJsdocContext,
  createSourceCode,
} from "./comment-utilities-test-helpers";

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
    const firstLineBreakLength = lines[0]?.lineBreakLength;

    // Assert
    expect(lines).toHaveLength(1);
    expect(firstLineBreakLength).toBe(0);
  });

  it("handles comment lines with CRLF line breaks", () => {
    // Arrange
    const lines = getCommentLines("first\r\nsecond");

    // Act
    const lineBreakLengths = lines.map((line) => line.lineBreakLength);

    // Assert
    expect(lines).toHaveLength(2);
    expect(lineBreakLengths).toStrictEqual([2, 0]);
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
    const range = buildRemovalRange(0, commentText, line);

    // Assert
    expect(range).toStrictEqual([5, 13]);
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
    const range = buildRemovalRange(0, commentText, line);

    // Assert
    expect(range).toStrictEqual([6, 12]);
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
    const range = buildRemovalRange(0, commentText, line);

    // Assert
    expect(range).toStrictEqual([0, 3]);
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
    const text = getCommentText(createSourceCode(sourceText, [comment]), comment);

    // Assert
    expect(text).toContain("ok");
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
