import { describe, expect, it } from "vitest";

import {
  createDualJsdocContext,
  createRangeMissingContext,
  createSingleJsdocContext,
} from "./comment-utilities-test-helpers";

describe("comment utilities test helpers", () => {
  it("creates single comment contexts", () => {
    // Arrange
    const { comment, sourceCode } = createSingleJsdocContext();

    // Act
    const allComments = sourceCode.getAllComments();

    // Assert
    expect(comment.type).toBe("Block");
    expect(allComments).toHaveLength(1);
  });

  it("creates dual comment contexts", () => {
    // Arrange
    const { second, sourceCode } = createDualJsdocContext();

    // Act
    const allComments = sourceCode.getAllComments();

    // Assert
    expect(second.value).toContain("second");
    expect(allComments).toHaveLength(2);
  });

  it("creates range-missing contexts", () => {
    // Arrange
    const { sourceCode } = createRangeMissingContext();

    // Act
    const allComments = sourceCode.getAllComments();

    // Assert
    expect(allComments).toHaveLength(1);
  });
});
