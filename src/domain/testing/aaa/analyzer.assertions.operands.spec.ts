import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import {
  getExpectOperands,
  isAssertionCall,
} from "./analyzer.assertions.operands";

describe("aAA analyzer assertions operands", () => {
  it("extracts expect operands and detects assertion call expressions", () => {
    // Arrange
    const expression = {
      arguments: [{ name: "actualResult", type: "Identifier" }],
      callee: { name: "expect", type: "Identifier" },
      type: "CallExpression",
    } as unknown as ESTree.CallExpression;

    // Act
    const actual = {
      assertionCall: isAssertionCall(expression),
      operands: getExpectOperands(expression),
    };

    // Assert
    expect(actual).toStrictEqual({
      assertionCall: true,
      operands: {
        actual: { name: "actualResult", type: "Identifier" },
        expected: void 0,
      },
    });
  });

  it.each(["expectTypeOf", "assertType"])(
    "treats %s() as an assertion call",
    (calleeName) => {
      // Arrange
      const expression = {
        arguments: [],
        callee: { name: calleeName, type: "Identifier" },
        type: "CallExpression",
      } as unknown as ESTree.CallExpression;

      // Act
      const actual = isAssertionCall(expression);

      // Assert
      expect(actual).toBe(true);
    },
  );
});
