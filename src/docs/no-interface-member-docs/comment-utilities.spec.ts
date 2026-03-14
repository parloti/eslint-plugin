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
    const { comment, node, sourceCode } = createSingleJsdocContext();

    expect(getJsdocComment(sourceCode, node)).toBe(comment);
  });

  it("skips when no comments exist", () => {
    const sourceText = "function demo() {}";
    const sourceCode = createSourceCode(sourceText, []);
    const node = {
      range: [0, sourceText.length],
      type: "FunctionDeclaration",
    } as Rule.Node;

    expect(getJsdocComment(sourceCode, node)).toBeUndefined();
  });

  it("prefers the closest JSDoc comment", () => {
    const { node, second, sourceCode } = createDualJsdocContext();

    expect(getJsdocComment(sourceCode, node)).toBe(second);
  });

  it("ignores non-jsdoc comments", () => {
    const { node, sourceCode } = createNonJsdocContext();

    expect(getJsdocComment(sourceCode, node)).toBeUndefined();
  });

  it("skips comments without ranges", () => {
    const { node, sourceCode } = createRangeMissingContext();

    expect(getJsdocComment(sourceCode, node)).toBeUndefined();
  });
});

describe("comment utilities removal ranges", () => {
  it("builds removal ranges for comment lines", () => {
    const commentText = "first\nsecond";
    const firstLine = getCommentLines(commentText)[0] ?? {
      end: 0,
      lineBreakLength: 0,
      start: 0,
      text: "",
    };
    const range = buildRemovalRange(0, commentText, firstLine);

    expect(range[1]).toBeGreaterThan(range[0]);
  });

  it("handles comment lines without line breaks", () => {
    const lines = getCommentLines("single");

    expect(lines).toHaveLength(1);
    expect(lines[0]?.lineBreakLength).toBe(0);
  });

  it("handles comment lines with CRLF line breaks", () => {
    const lines = getCommentLines("first\r\nsecond");

    expect(lines).toHaveLength(2);
    expect(lines[0]?.lineBreakLength).toBe(2);
    expect(lines[1]?.lineBreakLength).toBe(0);
  });

  it("handles removal ranges without a line break", () => {
    const commentText = "first\nsecond";
    const line = {
      end: 12,
      lineBreakLength: 0,
      start: 6,
      text: "second",
    };
    const range = buildRemovalRange(0, commentText, line);

    expect(range[0]).toBe(5);
    expect(range[1]).toBeGreaterThan(range[0]);
  });

  it("handles removal ranges with CRLF line breaks", () => {
    const commentText = "first\r\nsecond";
    const line = {
      end: 13,
      lineBreakLength: 0,
      start: 7,
      text: "second",
    };
    const range = buildRemovalRange(0, commentText, line);

    expect(range).toStrictEqual([5, 13]);
  });

  it("handles removal ranges without a prior line break", () => {
    const commentText = "first second";
    const line = {
      end: 12,
      lineBreakLength: 0,
      start: 6,
      text: "second",
    };
    const range = buildRemovalRange(0, commentText, line);

    expect(range).toStrictEqual([6, 12]);
  });

  it("handles removal ranges at the start of text", () => {
    const commentText = "abc";
    const line = {
      end: 3,
      lineBreakLength: 0,
      start: 0,
      text: "abc",
    };
    const range = buildRemovalRange(0, commentText, line);

    expect(range).toStrictEqual([0, 3]);
  });
});

describe("comment utilities text", () => {
  it("extracts comment text from the source", () => {
    const sourceText = "/**\n * ok\n */\nfunction demo() {}";
    const comment = createComment("*\n * ok\n ", [
      0,
      sourceText.indexOf("*/") + 2,
    ]);
    const sourceCode = createSourceCode(sourceText, [comment]);

    const text = getCommentText(sourceCode, comment);

    expect(text).toContain("ok");
  });

  it("returns an empty string when comment range is missing", () => {
    const sourceText = "/**\n * ok\n */\nfunction demo() {}";
    const comment = {
      type: "Block",
      value: "*\n * ok\n ",
    } as Comment;
    const sourceCode = createSourceCode(sourceText, [comment]);

    expect(getCommentText(sourceCode, comment)).toBe("");
  });
});
