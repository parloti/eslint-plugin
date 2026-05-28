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
    };

    // Act
    const actual = getCollapsedContent(comment);

    // Assert
    expect(actual).toBe("ok");
  });

  it("skips tagged content", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 2 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n * @param foo bar\n ",
    };

    // Act
    const actual = getCollapsedContent(comment);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("skips multiple content lines", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n * line one\n * line two\n ",
    };

    // Act
    const actual = getCollapsedContent(comment);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("trims empty edge lines before collapsing content", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 5 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n *\n * value\n *\n ",
    };

    // Act
    const actual = getCollapsedContent(comment);

    // Assert
    expect(actual).toBe("value");
  });

  it("keeps a single non-prefixed content line", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 2 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\nvalue\n ",
    };

    // Act
    const actual = getCollapsedContent(comment);

    // Assert
    expect(actual).toBe("value");
  });

  it("skips content that still contains blank interior lines", () => {
    // Arrange
    const comment: Comment = {
      loc: { end: { column: 0, line: 4 }, start: { column: 0, line: 1 } },
      range: [0, 0],
      type: "Block",
      value: "*\n * first\n *\n * second\n ",
    };

    // Act
    const actual = getCollapsedContent(comment);

    // Assert
    expect(actual).toBeUndefined();
  });
});
