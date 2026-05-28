import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import {
  getAssertDeclaredIdentifiers,
  getAssertionIdentifiers,
  getStatementExpression,
  hasAssertion,
  isActionExpression,
  isValidAssertStatement,
  unwrapExpression,
  usesPrefix,
} from "./analyzer.assertions.helpers";

describe("aAA analyzer assertions helpers", () => {
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

  it("collects asserted declarations and unwraps expression shapes", () => {
    // Arrange
    const analysis = {
      statements: [
        {
          node: {
            declarations: [
              {
                id: { name: "assertedValue", type: "Identifier" },
                type: "VariableDeclarator",
              },
              {
                id: { type: "ObjectPattern" },
                type: "VariableDeclarator",
              },
            ],
            type: "VariableDeclaration",
          },
          phases: ["Assert"],
        },
        {
          node: {
            declarations: [
              {
                id: { name: "ignoredValue", type: "Identifier" },
                type: "VariableDeclarator",
              },
            ],
            type: "VariableDeclaration",
          },
          phases: ["Act"],
        },
      ],
    } as never;
    const variableStatement = {
      declarations: [
        {
          init: { name: "capturedResult", type: "Identifier" },
          type: "VariableDeclarator",
        },
      ],
      type: "VariableDeclaration",
    } as ESTree.Statement;

    // Act
    const actual = {
      actionCall: isActionExpression({
        arguments: [],
        callee: { name: "run", type: "Identifier" },
        type: "CallExpression",
      } as never),
      actionNew: isActionExpression({
        arguments: [],
        callee: { name: "Promise", type: "Identifier" },
        type: "NewExpression",
      } as never),
      awaitedChain: unwrapExpression({
        expression: {
          argument: { name: "value", type: "Identifier" },
          type: "AwaitExpression",
        },
        type: "ChainExpression",
      } as never),
      declaredIdentifiers: [...getAssertDeclaredIdentifiers(analysis).keys()],
      statementExpression: getStatementExpression(variableStatement),
      usesPrefixExact: usesPrefix("actual", "actual"),
      usesPrefixPrefixed: usesPrefix("expectedValue", "expected"),
    };

    // Assert
    expect(actual).toStrictEqual({
      actionCall: true,
      actionNew: true,
      awaitedChain: {
        name: "value",
        type: "Identifier",
      },
      declaredIdentifiers: ["assertedValue"],
      statementExpression: {
        name: "capturedResult",
        type: "Identifier",
      },
      usesPrefixExact: true,
      usesPrefixPrefixed: true,
    });
  });

  it("rejects invalid assertion statements and non-action expressions", () => {
    // Arrange
    const noAssertion = {
      expression: { name: "value", type: "Identifier" },
      type: "ExpressionStatement",
    } as ESTree.Statement;
    const evaluatedAssertion = {
      expression: {
        arguments: [{ name: "value", type: "Identifier" }],
        callee: {
          object: { name: "expect", type: "Identifier" },
          property: { name: "toBe", type: "Identifier" },
          type: "MemberExpression",
        },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as ESTree.Statement;
    const nonExpressionStatement = {
      type: "ReturnStatement",
    } as ESTree.Statement;

    // Act
    const actual = {
      invalidAssertion: isValidAssertStatement(evaluatedAssertion),
      noAssertion: hasAssertion(noAssertion),
      nonAction: isActionExpression(void 0),
      nonExpressionStatement: getAssertionIdentifiers(nonExpressionStatement),
      nonStatementExpression: getStatementExpression({
        type: "ReturnStatement",
      }),
      plainStatement: isValidAssertStatement(nonExpressionStatement),
      shortPrefix: usesPrefix("expected", "actual"),
    };

    // Assert
    expect(actual).toStrictEqual({
      invalidAssertion: false,
      noAssertion: false,
      nonAction: false,
      nonExpressionStatement: {
        actual: void 0,
        expected: void 0,
      },
      nonStatementExpression: void 0,
      plainStatement: false,
      shortPrefix: false,
    });
  });
});
