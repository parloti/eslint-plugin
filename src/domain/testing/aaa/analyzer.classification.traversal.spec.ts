import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import {
  analyzerClassificationTraversalCompanion,
  visitStatementWithoutDeferredBodies,
} from "./analyzer.classification.traversal";

describe("aaa analyzer classification traversal", () => {
  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = analyzerClassificationTraversalCompanion;

    // Assert
    expect(actual).toBe(expected);
  });

  it("skips nested deferred function bodies during traversal", () => {
    // Arrange
    const statement = {
      expression: {
        arguments: [
          {
            body: {
              body: [
                {
                  expression: {
                    argument: { name: "deferred", type: "Identifier" },
                    type: "AwaitExpression",
                  },
                  type: "ExpressionStatement",
                },
              ],
              type: "BlockStatement",
            },
            type: "ArrowFunctionExpression",
          },
        ],
        callee: { name: "run", type: "Identifier" },
        type: "CallExpression",
      },
      type: "ExpressionStatement",
    } as ESTree.Statement;
    const visited: string[] = [];

    // Act
    const actual = ((): string[] => {
      visitStatementWithoutDeferredBodies(statement, (node) => {
        visited.push(node.type);
      });

      return visited;
    })();

    // Assert
    expect(actual).toContain("CallExpression");
    expect(actual).not.toContain("AwaitExpression");
  });
});
