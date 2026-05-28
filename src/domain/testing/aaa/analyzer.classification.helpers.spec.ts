import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import type { SourceComment } from "./types";

import {
  hasAsyncLogic,
  hasAwait,
  hasBlankLineBeforeComment,
  hasCapturableActResult,
  hasMutation,
  isMeaningfulActStatement,
  isSetupLikeStatement,
} from "./analyzer.classification.helpers";

describe("aAA analyzer classification helpers", () => {
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

  it("detects async logic, await usage, and mutations", () => {
    // Arrange
    const asyncLogicStatement = {
      expression: {
        arguments: [],
        callee: {
          object: { name: "task", type: "Identifier" },
          property: { name: "then", type: "Identifier" },
          type: "MemberExpression",
        },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;
    const awaitStatement = {
      expression: {
        argument: { name: "task", type: "Identifier" },
        type: "AwaitExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;
    const promiseStatement = {
      expression: {
        arguments: [],
        callee: { name: "Promise", type: "Identifier" },
        type: "NewExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;
    const mutationStatement = {
      expression: {
        arguments: [],
        callee: {
          object: { name: "items", type: "Identifier" },
          property: { name: "push", type: "Identifier" },
          type: "MemberExpression",
        },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;

    // Act
    const actual = {
      asyncLogic: hasAsyncLogic(asyncLogicStatement),
      awaitUsage: hasAwait(awaitStatement),
      promiseLogic: hasAsyncLogic(promiseStatement),
      pushMutation: hasMutation(mutationStatement),
    };

    // Assert
    expect(actual).toStrictEqual({
      asyncLogic: true,
      awaitUsage: true,
      promiseLogic: true,
      pushMutation: true,
    });
  });

  it("distinguishes setup-like and meaningful act statements", () => {
    // Arrange
    const sourceCodeSetup = {
      declarations: [
        {
          init: {
            arguments: [],
            callee: { name: "SourceCode", type: "Identifier" },
            type: "NewExpression",
          },
          type: "VariableDeclarator",
        },
      ],
      type: "VariableDeclaration",
    } as unknown as ESTree.Statement;
    const ruleCreateSetup = {
      declarations: [
        {
          init: {
            arguments: [],
            callee: {
              object: { name: "customRule", type: "Identifier" },
              property: { name: "create", type: "Identifier" },
              type: "MemberExpression",
            },
            type: "CallExpression",
          },
          type: "VariableDeclarator",
        },
      ],
      type: "VariableDeclaration",
    } as unknown as ESTree.Statement;
    const actionStatement = {
      expression: {
        arguments: [{ name: "input", type: "Identifier" }],
        callee: { name: "run", type: "Identifier" },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;
    const assertedActionStatement = {
      expression: {
        arguments: [
          { name: "actual", type: "Identifier" },
          { name: "expected", type: "Identifier" },
        ],
        callee: {
          object: { name: "assert", type: "Identifier" },
          property: { name: "equal", type: "Identifier" },
          type: "MemberExpression",
        },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;

    // Act
    const actual = {
      actionStatement: isMeaningfulActStatement(actionStatement),
      assertedActionStatement: isMeaningfulActStatement(
        assertedActionStatement,
      ),
      ruleCreateCapturable: hasCapturableActResult(ruleCreateSetup),
      ruleCreateSetup: isSetupLikeStatement(ruleCreateSetup),
      sourceCodeSetup: isSetupLikeStatement(sourceCodeSetup),
    };

    // Assert
    expect(actual).toStrictEqual({
      actionStatement: true,
      assertedActionStatement: false,
      ruleCreateCapturable: false,
      ruleCreateSetup: false,
      sourceCodeSetup: true,
    });
  });

  it("treats utility-style calls and non-located comments as non-capturable or blank", () => {
    // Arrange
    const utilityCallStatement = {
      expression: {
        arguments: [],
        callee: { name: "scheduleAndFlush", type: "Identifier" },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as unknown as ESTree.Statement;
    const nonLocatedComment = {
      loc: void 0,
      range: [0, 0],
      type: "Line",
      value: " Arrange",
    } as never;

    // Act
    const actual = {
      blankLineBeforeComment: hasBlankLineBeforeComment("", nonLocatedComment),
      capturableActResult: hasCapturableActResult(utilityCallStatement),
    };

    // Assert
    expect(actual).toStrictEqual({
      blankLineBeforeComment: true,
      capturableActResult: false,
    });
  });
});
