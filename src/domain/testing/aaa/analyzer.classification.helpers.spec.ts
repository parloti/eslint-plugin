import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import type { SourceComment } from "./types";

import { hasBlankLineBeforeComment, hasCapturableActResult } from "./analyzer";
import { analyzerClassificationHelpersCompanion } from "./analyzer.classification.helpers";

describe("aAA analyzer classification helpers", () => {
  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = analyzerClassificationHelpersCompanion;

    // Assert
    expect(actual).toBe(expected);
  });

  it("classifies blank-line boundaries and capturable act results", () => {
    // Arrange
    const sourceText = ["const a = 1;", "", "// Arrange"].join("\n");
    const comment = {
      loc: { end: { column: 10, line: 3 }, start: { column: 0, line: 3 } },
      range: [20, 30],
      type: "Line",
      value: " Arrange",
    } as unknown as SourceComment;
    const statement = {
      expression: {
        arguments: [{ name: "input", type: "Identifier" }],
        callee: { name: "run", type: "Identifier" },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;

    // Act
    const actual = {
      blankLineBeforeComment: hasBlankLineBeforeComment(sourceText, comment),
      capturableActResult: hasCapturableActResult(statement),
    };

    // Assert
    expect(actual).toStrictEqual({
      blankLineBeforeComment: true,
      capturableActResult: true,
    });
  });

  it.each([
    ["WeakSet", "new WeakSet()"],
    ["WeakMap", "new WeakMap()"],
  ])(
    "treats new %s() as a non-capturable utility constructor in Arrange",
    (_name) => {
      // Arrange
      const statement = {
        declarations: [
          {
            id: { name: "seenNodes", type: "Identifier" },
            init: {
              arguments: [],
              callee: { name: _name, type: "Identifier" },
              type: "NewExpression",
            },
            type: "VariableDeclarator",
          },
        ],
        kind: "const",
        type: "VariableDeclaration",
      } as unknown as ESTree.Statement;

      // Act
      const actual = hasCapturableActResult(statement);

      // Assert
      expect(actual).toBe(false);
    },
  );

  it("treats calls with void-like name tokens as non-capturable", () => {
    // Arrange
    const statement = {
      expression: {
        arguments: [],
        callee: { name: "scheduleAndFlush", type: "Identifier" },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;

    // Act
    const actual = hasCapturableActResult(statement);

    // Assert
    expect(actual).toBe(false);
  });
});
