import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { buildMissingSectionFixes } from "./missing-section-fixes";

describe("enforce-aaa-structure missing-section-fixes", () => {
  it("exports buildMissingSectionFixes", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actual = typeof buildMissingSectionFixes;

    // Assert
    expect(actual).toBe(expectedType);
  });

  it("groups missing phases by insertion point and preserves blank lines", () => {
    // Arrange
    const sourceText = [
      "const arrange = createArrange();",
      "expect(actualResult).toBe(expectedResult);",
    ].join("\n");
    const analysis = {
      newline: "\n",
      sectionComments: [],
      sourceText,
      statements: [
        { node: { range: [0, 31] } },
        { node: { range: [sourceText.indexOf("\n") + 1, sourceText.length] } },
      ],
    } as never;
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actualFixes = buildMissingSectionFixes(
      analysis,
      ["Arrange", "Act", "Assert"],
      fixer,
    );

    // Assert
    expect(actualFixes).toStrictEqual([
      { range: [0, 0], text: "// Arrange\n" },
      { range: [33, 33], text: "// Act & Assert\n" },
    ]);
  });

  it("returns no fixes when no statements are available", () => {
    // Arrange
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actualFixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sectionComments: [],
        sourceText: "",
        statements: [],
      } as never,
      ["Arrange"],
      fixer,
    );

    // Assert
    expect(actualFixes).toStrictEqual([]);
  });

  it("supports default anchors and avoids extra blank lines at the top", () => {
    // Arrange
    const sourceText = ["  run();", "  expect(value).toBe(1);"].join("\n");
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actualFixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sectionComments: [],
        sourceText,
        statements: [
          { node: { range: [0, 8] } },
          { node: { range: [9, sourceText.length] } },
        ],
      } as never,
      ["Unexpected" as never],
      fixer,
    );

    // Assert
    expect(actualFixes).toStrictEqual([
      { range: [9, 9], text: "\n  // Unexpected\n" },
    ]);
  });

  it("does not add a second blank line when a non-arrange phase already has one", () => {
    // Arrange
    const sourceText = ["", "  run();"].join("\n");
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actualFixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sectionComments: [],
        sourceText,
        statements: [{ node: { range: [1, sourceText.length] } }],
      } as never,
      ["Act"],
      fixer,
    );

    // Assert
    expect(actualFixes).toStrictEqual([{ range: [1, 1], text: "  // Act\n" }]);
  });

  it("handles sparse statement collections without anchors", () => {
    // Arrange
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actualFixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sectionComments: [],
        sourceText: "run();",
        statements: [void 0 as never, { node: { range: [0, 6] } }],
      } as never,
      ["Arrange"],
      fixer,
    );

    // Assert
    expect(actualFixes).toStrictEqual([]);
  });

  it("uses existing statement anchors for each missing phase", () => {
    // Arrange
    const sourceText = ["  arrange();", "  act();", "  assert();"].join("\n");
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actualFixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sectionComments: [{ value: " Arrange" }],
        sourceText,
        statements: [
          { node: { range: [0, 12] } },
          { node: { range: [13, 21] } },
          { node: { range: [22, sourceText.length] } },
        ],
      } as never,
      ["Assert", "Act", "Arrange"],
      fixer,
    );

    // Assert
    expect(actualFixes).toStrictEqual([
      { range: [22, 22], text: "\n  // Assert\n" },
      { range: [13, 13], text: "\n  // Act\n" },
      { range: [0, 0], text: "  // Arrange\n" },
    ]);
  });

  it("groups phases sharing an anchor and returns no fixes without anchor statements", () => {
    // Arrange
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const actual = {
      groupedFixes: buildMissingSectionFixes(
        {
          newline: "\n",
          sectionComments: [{ value: " Arrange" }],
          sourceText: "  run();",
          statements: [{ node: { range: [0, 8] } }],
        } as never,
        ["Assert", "Act", "Arrange"],
        fixer,
      ),
      missingAnchorFixes: buildMissingSectionFixes(
        {
          newline: "\n",
          sectionComments: [{ value: " Arrange" }],
          sourceText: "",
          statements: [],
        } as never,
        ["Arrange"],
        fixer,
      ),
    };

    // Assert
    expect(actual.groupedFixes).toStrictEqual([
      { range: [0, 0], text: "  // Arrange & Act & Assert\n" },
    ]);
    expect(actual.missingAnchorFixes).toStrictEqual([]);
  });
});
