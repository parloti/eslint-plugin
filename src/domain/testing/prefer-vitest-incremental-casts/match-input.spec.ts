import { TSESTree } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";

import { getFactoryMatchInput } from "./match-input";

describe("prefer-vitest-incremental-casts match input", () => {
  it("skips non-Vitest calls", () => {
    // Arrange
    const callExpression = {
      arguments: [],
      callee: {
        name: "mock",
        type: TSESTree.AST_NODE_TYPES.Identifier,
      },
      type: TSESTree.AST_NODE_TYPES.CallExpression,
    } as never;

    // Act
    const actual = getFactoryMatchInput(callExpression);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("skips Vitest calls that do not have supported factory arguments", () => {
    // Arrange
    const callExpression = {
      arguments: [
        {
          argument: {
            name: "specifier",
            type: TSESTree.AST_NODE_TYPES.Identifier,
          },
          type: TSESTree.AST_NODE_TYPES.SpreadElement,
        },
      ],
      callee: {
        object: {
          name: "vi",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        property: {
          name: "mock",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        type: TSESTree.AST_NODE_TYPES.MemberExpression,
      },
      type: TSESTree.AST_NODE_TYPES.CallExpression,
    } as never;

    // Act
    const actual = getFactoryMatchInput(callExpression);

    // Assert
    expect(actual).toBeUndefined();
  });

  it("skips factories that return a single direct cast without an escape hatch", () => {
    // Arrange
    const objectExpression = {
      properties: [],
      range: [0, 2],
      type: TSESTree.AST_NODE_TYPES.ObjectExpression,
    } as never;
    const typeReference = {
      type: TSESTree.AST_NODE_TYPES.TSTypeReference,
      typeName: { name: "SomeType", type: TSESTree.AST_NODE_TYPES.Identifier },
    } as never;
    const directCast = {
      expression: objectExpression,
      range: [0, 20],
      type: TSESTree.AST_NODE_TYPES.TSAsExpression,
      typeAnnotation: typeReference,
    } as never;
    const callExpression = {
      arguments: [
        {
          source: {
            type: TSESTree.AST_NODE_TYPES.Literal,
            value: "fixture-module",
          },
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
        {
          body: directCast,
          type: TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
        },
      ],
      callee: {
        object: {
          name: "vi",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        property: {
          name: "doMock",
          type: TSESTree.AST_NODE_TYPES.Identifier,
        },
        type: TSESTree.AST_NODE_TYPES.MemberExpression,
      },
      type: TSESTree.AST_NODE_TYPES.CallExpression,
    } as never;

    // Act
    const actual = getFactoryMatchInput(callExpression);

    // Assert
    expect(actual).toBeUndefined();
  });
});
