import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { visitNode } from "./analyzer.super";
import { analyzerSuperHelpersCompanion } from "./analyzer.super.helpers";

describe("aAA analyzer super helpers", () => {
  it("exports the companion marker", () => {
    // Arrange
    const expected = true;

    // Act
    const actual = analyzerSuperHelpersCompanion;

    // Assert
    expect(actual).toBe(expected);
  });

  it("visits each node exactly once even when graph references repeat", () => {
    // Arrange
    const identifier: ESTree.Identifier = { name: "value", type: "Identifier" };
    const expression: ESTree.ExpressionStatement = {
      expression: identifier,
      type: "ExpressionStatement",
    };
    const root: ESTree.Program = {
      body: [expression],
      sourceType: "module",
      type: "Program",
    };

    const visited: string[] = [];

    // Act
    const actual = ((): string[] => {
      visitNode(root, (node) => {
        visited.push(node.type);
        return true;
      });

      return visited;
    })();

    // Assert
    expect(actual).toStrictEqual([
      "Program",
      "ExpressionStatement",
      "Identifier",
    ]);
  });

  it("stops descending when the callback returns false", () => {
    // Arrange
    const root: ESTree.Program = {
      body: [
        {
          expression: { name: "value", type: "Identifier" },
          type: "ExpressionStatement",
        },
      ],
      sourceType: "module",
      type: "Program",
    };

    // Act
    const actual = ((): string[] => {
      const visited: string[] = [];

      visitNode(root, (node) => {
        visited.push(node.type);
        return false;
      });

      return visited;
    })();

    // Assert
    expect(actual).toStrictEqual(["Program"]);
  });

  it("returns immediately when the node was already seen", () => {
    // Arrange
    const root: ESTree.Program = {
      body: [],
      sourceType: "module",
      type: "Program",
    };
    const seenNodes = new WeakSet<object>([root]);

    // Act
    const actual = ((): string[] => {
      const visited: string[] = [];

      visitNode(
        root,
        (node) => {
          visited.push(node.type);
          return true;
        },
        seenNodes,
      );

      return visited;
    })();

    // Assert
    expect(actual).toStrictEqual([]);
  });
});
