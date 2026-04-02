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
});
