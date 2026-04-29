import type * as ESTree from "estree";

import { describe, expect, it } from "vitest";

import { getAssertDeclaredIdentifiers } from "./analyzer";
import { analyzerAssertionsDestructuredCompanion } from "./analyzer.assertions.destructured";

describe("aAA analyzer assertion helper declarations", () => {
  it("ignores destructured Assert declarations when collecting identifiers", () => {
    // Arrange
    const analysis = {
      statements: [
        {
          node: {
            declarations: [
              {
                id: {
                  properties: [
                    {
                      key: { name: "actualResult", type: "Identifier" },
                      type: "Property",
                      value: { name: "actualResult", type: "Identifier" },
                    },
                  ],
                  type: "ObjectPattern",
                },
                init: {
                  name: "computedResult",
                  type: "Identifier",
                },
                type: "VariableDeclarator",
              },
            ],
            kind: "const",
            type: "VariableDeclaration",
          } as ESTree.VariableDeclaration,
          phases: ["Assert"],
        },
      ],
    } as never;

    // Act
    const actual = {
      companion: analyzerAssertionsDestructuredCompanion,
      identifiers: [...getAssertDeclaredIdentifiers(analysis).keys()],
    };

    // Assert
    expect(actual).toStrictEqual({
      companion: true,
      identifiers: [],
    });
  });
});
