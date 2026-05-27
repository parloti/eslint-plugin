import type { TestBlockAnalysis } from "../aaa/types";

/** Message identifiers emitted by the rule under test. */
type RequireAaaSectionsMessageId =
  | "blankLineBeforeSection"
  | "codeBeforeArrange"
  | "emptySection"
  | "missingSections"
  | "outOfOrderSection";

/**
 * Creates mock section comments.
 * @returns Mock section comments with Arrange and Act phases.
 * @example
 * ```typescript
 * const c = getMockSectionComments(); void c;
 * ```
 */
function getMockSectionComments(): TestBlockAnalysis["sectionComments"] {
  return [
    {
      comment: {
        loc: { end: { column: 0, line: 2 }, start: { column: 0, line: 2 } },
        range: [0, 10],
        type: "Line",
        value: " Arrange",
      },
      phases: ["Arrange"],
    },
    {
      comment: {
        loc: { end: { column: 0, line: 4 }, start: { column: 0, line: 4 } },
        range: [0, 10],
        type: "Line",
        value: " Act",
      },
      phases: ["Act"],
    },
  ];
}

/**
 * Creates mock statements for test analysis.
 * @returns Mock statements with phase assignments.
 * @example
 * ```typescript
 * const s = getMockStatements(); void s;
 * ```
 */
function getMockStatements(): TestBlockAnalysis["statements"] {
  return [
    {
      node: {
        expression: { type: "Identifier" } as never,
        loc: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } },
        range: [0, 5],
        type: "ExpressionStatement",
      },
      phase: void 0,
      phases: [],
    },
    {
      node: {
        expression: { type: "Identifier" } as never,
        loc: { end: { column: 0, line: 3 }, start: { column: 0, line: 3 } },
        range: [0, 5],
        type: "ExpressionStatement",
      },
      phase: "Arrange" as const,
      phases: ["Arrange" as const],
    },
    {
      node: {
        expression: { type: "Identifier" } as never,
        loc: { end: { column: 0, line: 5 }, start: { column: 0, line: 5 } },
        range: [0, 5],
        type: "ExpressionStatement",
      },
      phase: "Act" as const,
      phases: ["Act" as const],
    },
  ];
}

/**
 * Checks whether an unknown value is a valid rule message identifier.
 * @param value Value to validate.
 * @returns True if the value is a supported message identifier.
 * @example
 * ```typescript
 * const ok = isRequireAaaSectionsMessageId("missingSections");
 * void ok;
 * ```
 */
function isRequireAaaSectionsMessageId(
  value: unknown,
): value is RequireAaaSectionsMessageId {
  return (
    value === "blankLineBeforeSection" ||
    value === "codeBeforeArrange" ||
    value === "emptySection" ||
    value === "missingSections" ||
    value === "outOfOrderSection"
  );
}

export type { RequireAaaSectionsMessageId };

export {
  getMockSectionComments,
  getMockStatements,
  isRequireAaaSectionsMessageId,
};
