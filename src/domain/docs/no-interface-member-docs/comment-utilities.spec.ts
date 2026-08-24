import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { Comment } from "./__tests__/no-interface-member-documentation-comment-utilities-test-helpers";

import {
  createComment,
  createDualJsdocContext,
  createNonJsdocContext,
  createRangeMissingContext,
  createSingleJsdocContext,
  createSourceCode,
} from "./__tests__/no-interface-member-documentation-comment-utilities-test-helpers";
import { getCommentText, getJsdocComment } from "./comment-utilities";

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
