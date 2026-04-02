import { describe, expect, it } from "vitest";

import type { Comment } from "./single-line-jsdoc-content";

import { getCollapsedContent } from "./single-line-jsdoc-content";

describe("single-line-jsdoc content", () => {
  it("collapses plain content", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 2 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n * ok\n ",
    } as Comment;

    // Act & Assert
    expect(getCollapsedContent(comment)).toBe("ok");
  });

  it("skips tagged content", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 2 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n * @param foo bar\n ",
    } as Comment;

    // Act & Assert
    expect(getCollapsedContent(comment)).toBeUndefined();
  });

  it("skips multiple content lines", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n * line one\n * line two\n ",
    } as Comment;

    // Act & Assert
    expect(getCollapsedContent(comment)).toBeUndefined();
  });
});
