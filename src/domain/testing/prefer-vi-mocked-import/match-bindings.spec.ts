import { describe, expect, expectTypeOf, it } from "vitest";

import type { Declaration } from "./types";

import { collectBindings } from "./match-bindings";

describe("prefer-vi-mocked-import match-bindings", () => {
  it("exports collectBindings", () => {
    // Arrange

    // Act & Assert
    expectTypeOf(collectBindings).toBeFunction();
  });

  it("ignores properties with keys that do not include a range", () => {
    // Arrange
    const bindings = {
      properties: [
        {
          computed: false,
          key: { name: "a", type: "Identifier" },
          kind: "init",
          method: false,
          range: [0, 3],
          shorthand: true,
          type: "Property",
          value: { name: "a", range: [1, 2], type: "Identifier" },
        },
      ],
      type: "ObjectExpression",
    } as never;
    const declarations = new Map<string, Declaration>([
      [
        "a",
        {
          declarationIdRange: [0, 1],
          initializerRange: [4, 10],
          localName: "a",
          statementRange: [0, 10],
        },
      ],
    ]);

    // Act
    const result = collectBindings(bindings, declarations);

    // Assert
    expect(result).toStrictEqual([]);
  });

  it("ignores non-property entries", () => {
    // Arrange
    const bindings = {
      properties: [
        {
          argument: { name: "a", type: "Identifier" },
          type: "SpreadElement",
        },
      ],
      type: "ObjectExpression",
    } as never;
    const declarations = new Map<string, Declaration>();

    // Act
    const result = collectBindings(bindings, declarations);

    // Assert
    expect(result).toStrictEqual([]);
  });
});
