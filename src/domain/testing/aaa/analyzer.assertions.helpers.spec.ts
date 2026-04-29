import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import {
  getAssertionIdentifiers,
  hasAssertion,
  isValidAssertStatement,
} from "./analyzer";
import { analyzerAssertionsHelpersCompanion } from "./analyzer.assertions.helpers";

describe("aAA analyzer assertions helpers", () => {
  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = analyzerAssertionsHelpersCompanion;

    // Assert
    expect(actual).toBe(expected);
  });

  it("resolves identifiers and assertion validity through the public analyzer api", () => {
    // Arrange
    const statement = {
      expression: {
        arguments: [
          { name: "actualResult", type: "Identifier" },
          { name: "expectedResult", type: "Identifier" },
        ],
        callee: {
          object: { name: "assert", type: "Identifier" },
          property: { name: "strictEqual", type: "Identifier" },
          type: "MemberExpression",
        },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;

    // Act
    const actual = {
      assertion: hasAssertion(statement),
      identifiers: getAssertionIdentifiers(statement),
      valid: isValidAssertStatement(statement),
    };

    // Assert
    expect(actual).toStrictEqual({
      assertion: true,
      identifiers: { actual: "actualResult", expected: "expectedResult" },
      valid: true,
    });
  });
});
