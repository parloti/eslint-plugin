import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { hasAssertion, hasMutation } from "./analyzer";
import { analyzerClassificationMutationsCompanion } from "./analyzer.classification.mutations";

describe("aaa analyzer statement classification mutations", () => {
  it("detects mutations, delete expressions, and assertion calls", () => {
    // Arrange
    const mutationStatement = {
      expression: {
        arguments: [{ name: "value", type: "Identifier" }],
        callee: {
          object: { name: "items", type: "Identifier" },
          property: { name: "push", type: "Identifier" },
          type: "MemberExpression",
        },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as ESTree.Statement;
    const nonMutationUnaryStatement = {
      expression: {
        argument: { name: "ready", type: "Identifier" },
        operator: "!",
        prefix: true,
        type: "UnaryExpression",
      },
      type: "ExpressionStatement",
    } as ESTree.Statement;
    const assertionStatement = {
      expression: {
        arguments: [{ name: "result", type: "Identifier" }],
        callee: { name: "expect", type: "Identifier" },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as ESTree.Statement;
    const deleteStatement = {
      expression: {
        argument: {
          object: { name: "cache", type: "Identifier" },
          property: { name: "value", type: "Identifier" },
          type: "MemberExpression",
        },
        operator: "delete",
        prefix: true,
        type: "UnaryExpression",
      },
      type: "ExpressionStatement",
    } as ESTree.Statement;

    // Act
    const actual = {
      assertionStatement: hasAssertion(assertionStatement),
      companion: analyzerClassificationMutationsCompanion,
      deleteStatement: hasMutation(deleteStatement),
      mutationStatement: hasMutation(mutationStatement),
      nonMutationUnaryStatement: hasMutation(nonMutationUnaryStatement),
    };

    // Assert
    expect(actual).toStrictEqual({
      assertionStatement: true,
      companion: true,
      deleteStatement: true,
      mutationStatement: true,
      nonMutationUnaryStatement: false,
    });
  });
});
