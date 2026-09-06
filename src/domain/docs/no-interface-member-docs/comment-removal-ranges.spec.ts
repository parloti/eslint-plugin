import { describe, expect, it } from "vitest";

import { buildRemovalRange, getCommentLines } from "./comment-removal-ranges";

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
    const line = { end: 12, lineBreakLength: 0, start: 6, text: "second" };

    // Act
    const range = buildRemovalRange(0, commentText, line);

    // Assert
    expect(range[0]).toBe(5);
    expect(range[1]).toBeGreaterThan(range[0]);
  });

  it("handles removal ranges with CRLF line breaks", () => {
    // Arrange
    const commentText = "first\r\nsecond";
    const line = { end: 13, lineBreakLength: 0, start: 7, text: "second" };

    // Act
    const actualRange = buildRemovalRange(0, commentText, line);

    // Assert
    expect(actualRange).toStrictEqual([5, 13]);
  });

  it("handles removal ranges without a prior line break", () => {
    // Arrange
    const commentText = "first second";
    const line = { end: 12, lineBreakLength: 0, start: 6, text: "second" };

    // Act
    const actualRange = buildRemovalRange(0, commentText, line);

    // Assert
    expect(actualRange).toStrictEqual([6, 12]);
  });

  it("handles removal ranges at the start of text", () => {
    // Arrange
    const commentText = "abc";
    const line = { end: 3, lineBreakLength: 0, start: 0, text: "abc" };

    // Act
    const actualRange = buildRemovalRange(0, commentText, line);

    // Assert
    expect(actualRange).toStrictEqual([0, 3]);
  });
});
