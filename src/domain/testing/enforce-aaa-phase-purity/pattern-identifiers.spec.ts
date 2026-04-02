import { describe, expect, it } from "vitest";

import { collectPatternIdentifiers } from "./pattern-identifiers";

/**
 * Collects and sorts identifiers from the fixture patterns used in this spec.
 * @returns Sorted identifier names gathered from the fixtures.
 * @example
 * ```typescript
 * const identifiers = collectFixtureIdentifiers();
 * ```
 */
function collectFixtureIdentifiers(): string[] {
  const identifiers = new Set<string>();
  const nestedPattern = createNestedPattern();

  collectPatternIdentifiers(
    {
      elements: [
        { name: "arrayValue", type: "Identifier" },
        {
          argument: { name: "arrayRest", type: "Identifier" },
          type: "RestElement",
        },
      ],
      type: "ArrayPattern",
    } as never,
    identifiers,
  );
  collectPatternIdentifiers(nestedPattern as never, identifiers);
  collectPatternIdentifiers(
    {
      left: { name: "assignedValue", type: "Identifier" },
      right: { name: "fallback", type: "Identifier" },
      type: "AssignmentPattern",
    } as never,
    identifiers,
  );
  collectPatternIdentifiers(
    { name: "plainValue", type: "Identifier" } as never,
    identifiers,
  );
  collectPatternIdentifiers(
    {
      argument: { name: "directRest", type: "Identifier" },
      type: "RestElement",
    } as never,
    identifiers,
  );

  return [...identifiers].toSorted();
}

/**
 * Creates a nested object pattern with array holes and rest elements.
 * @returns Nested object pattern fixture.
 * @example
 * ```typescript
 * const pattern = createNestedPattern();
 * ```
 */
function createNestedPattern(): Record<string, unknown> {
  return {
    properties: [
      {
        computed: false,
        key: { name: "value", type: "Identifier" },
        kind: "init",
        method: false,
        shorthand: true,
        type: "Property",
        value: { name: "value", type: "Identifier" },
      },
      {
        computed: false,
        key: { name: "configured", type: "Identifier" },
        kind: "init",
        method: false,
        shorthand: false,
        type: "Property",
        value: {
          left: { name: "configured", type: "Identifier" },
          right: { name: "fallback", type: "Identifier" },
          type: "AssignmentPattern",
        },
      },
      {
        computed: false,
        key: { name: "items", type: "Identifier" },
        kind: "init",
        method: false,
        shorthand: false,
        type: "Property",
        value: {
          elements: [
            { name: "first", type: "Identifier" },
            void 0,
            {
              argument: { name: "restItems", type: "Identifier" },
              type: "RestElement",
            },
          ],
          type: "ArrayPattern",
        },
      },
      {
        argument: { name: "remaining", type: "Identifier" },
        type: "RestElement",
      },
    ],
    type: "ObjectPattern",
  };
}

describe("enforce-aaa-phase-purity pattern-identifiers", () => {
  it("exports the pattern helper", () => {
    // Arrange
    const helperTypes = [typeof collectPatternIdentifiers] as const;

    // Act & Assert
    expect(helperTypes).toStrictEqual(["function"]);
  });

  it("collects identifiers from nested supported patterns", () => {
    // Arrange
    const expected = [
      "arrayRest",
      "arrayValue",
      "assignedValue",
      "configured",
      "directRest",
      "first",
      "plainValue",
      "remaining",
      "restItems",
      "value",
    ];

    // Act
    const actual = collectFixtureIdentifiers();

    // Assert
    expect(actual).toStrictEqual(expected);
  });

  it("ignores unsupported pattern kinds", () => {
    // Arrange
    const identifiers = new Set<string>();

    // Act
    const actual = ((): string[] => {
      collectPatternIdentifiers(
        { type: "Literal", value: 1 } as never,
        identifiers,
      );

      return [...identifiers];
    })();

    // Assert
    expect(actual).toStrictEqual([]);
  });
});
