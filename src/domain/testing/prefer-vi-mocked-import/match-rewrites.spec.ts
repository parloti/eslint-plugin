import { describe, expect, it } from "vitest";

import { buildAllowedRanges, collectMemberRewrites } from "./match-rewrites";

describe("prefer-vi-mocked-import match-rewrites", () => {
  it("exports collectMemberRewrites", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof collectMemberRewrites;

    // Assert
    expect(actualType).toBe(expectedType);
  });

  it("includes declaration id ranges when declaration exists", () => {
    // Arrange
    const allowed = buildAllowedRanges(
      [
        {
          exportedName: "a",
          localName: "a",
          propertyKeyRange: [1, 2],
          propertyRange: [1, 5],
          propertyValueRange: [3, 4],
        },
      ],
      new Map([
        [
          "a",
          {
            declarationIdRange: [10, 11],
            initializerRange: [12, 18],
            localName: "a",
            statementRange: [10, 19],
          },
        ],
      ]),
      [],
    );

    // Act
    const hasDeclarationIdRange = allowed.has("10:11");

    // Assert
    expect(hasDeclarationIdRange).toBe(true);
  });

  it("skips declaration id range when declaration is absent", () => {
    // Arrange
    const allowed = buildAllowedRanges(
      [
        {
          exportedName: "a",
          localName: "a",
          propertyKeyRange: [1, 2],
          propertyRange: [1, 5],
          propertyValueRange: [3, 4],
        },
      ],
      new Map(),
      [],
    );

    // Act
    const hasDeclarationIdRange = allowed.has("10:11");

    // Assert
    expect(hasDeclarationIdRange).toBe(false);
  });
});
