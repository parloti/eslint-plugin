import { describe, expect, it } from "vitest";

import {
  createContext,
  createReplacementReader,
} from "./no-multiple-declarators-rule-test-helpers";

describe("no-multiple-declarators rule test helpers", () => {
  it("reads whole-source text when getText has no node", () => {
    // Arrange
    const sourceText = "const value = 1;";
    const { context } = createContext(sourceText);

    // Act
    const actualText = context.sourceCode.getText();

    // Assert
    expect(actualText).toBe(sourceText);
  });

  it("reads whole-source text when the node has no range", () => {
    // Arrange
    const sourceText = "const value = 1;";
    const { context } = createContext(sourceText);

    // Act
    const actualText = context.sourceCode.getText({
      type: "Identifier",
    } as never);

    // Assert
    expect(actualText).toBe(sourceText);
  });

  it("reads only the requested range when the node has a range", () => {
    // Arrange
    const sourceText = "const value = 1;";
    const { context } = createContext(sourceText);

    // Act
    const actualText = context.sourceCode.getText({
      range: [6, 11],
      type: "Identifier",
    } as never);

    // Assert
    expect(actualText).toBe("value");
  });

  it("records reports that omit both a message identifier and a node", () => {
    // Arrange
    const { context, reports } = createContext("source text");

    // Act
    context.report({
      message: "A report without a node or identifier",
    } as never);

    // Assert
    expect(reports).toStrictEqual([
      { fix: undefined, messageId: undefined, nodeType: undefined },
    ]);
  });

  it("returns no replacement when there is no reported fixer", () => {
    // Arrange
    const getReplacement = createReplacementReader([]);

    // Act
    const actual = getReplacement();

    // Assert
    expect(actual).toBeUndefined();
  });

  it.each([
    ["a falsey fix result", () => 0],
    ["an array of fixes", () => []],
    ["a fix without replacement text", () => ({ range: [0, 1] })],
  ])("returns no replacement for %s", (_description, fix) => {
    // Arrange
    const getReplacement = createReplacementReader([
      {
        fix: fix as never,
        messageId: "singleDeclarator",
        nodeType: "VariableDeclaration",
      },
    ]);

    // Act
    const actual = getReplacement();

    // Assert
    expect(actual).toBeUndefined();
  });
});
