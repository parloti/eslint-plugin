import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { buildMissingSectionFixes } from "./missing-section-fixes";

describe("require-aaa-sections missing-section-fixes", () => {
  it("exports buildMissingSectionFixes", () => {
    // Arrange

    // Act
    const actual = typeof buildMissingSectionFixes;

    // Assert
    expect(actual).toBe("function");
  });

  it("groups missing phases by insertion point and preserves blank lines", () => {
    // Arrange
    const sourceText = [
      "const arrange = createArrange();",
      "expect(actualResult).toBe(expectedResult);",
    ].join("\n");
    const secondStatementStart = sourceText.indexOf("\n") + 1;
    const analysis = {
      newline: "\n",
      sourceText,
      statements: [
        { node: { range: [0, 31] } },
        { node: { range: [secondStatementStart, sourceText.length] } },
      ],
    } as never;
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
      }),
    } as Rule.RuleFixer;

    // Act
    const fixes = buildMissingSectionFixes(
      analysis,
      ["Arrange", "Act", "Assert"],
      fixer,
    );

    // Assert
    expect(fixes).toStrictEqual([
      { range: [0, 0], text: "// Arrange\n" },
      {
        range: [secondStatementStart, secondStatementStart],
        text: "\n// Act & Assert\n",
      },
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
    const fixes = buildMissingSectionFixes(
      { newline: "\n", sourceText: "", statements: [] } as never,
      ["Arrange"],
      fixer,
    );

    // Assert
    expect(fixes).toStrictEqual([]);
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
    const fixes = buildMissingSectionFixes(
      {
        newline: "\n",
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
    expect(fixes).toStrictEqual([
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
    const fixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sourceText,
        statements: [{ node: { range: [1, sourceText.length] } }],
      } as never,
      ["Act"],
      fixer,
    );

    // Assert
    expect(fixes).toStrictEqual([{ range: [1, 1], text: "  // Act\n" }]);
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
    const fixes = buildMissingSectionFixes(
      {
        newline: "\n",
        sourceText: "run();",
        statements: [void 0 as never, { node: { range: [0, 6] } }],
      } as never,
      ["Arrange"],
      fixer,
    );

    // Assert
    expect(fixes).toStrictEqual([]);
  });
});
