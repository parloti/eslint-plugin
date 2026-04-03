import { describe, expect, it } from "vitest";

import { buildCombinedImportFixes } from "./fix-imports";

describe("prefer-vi-mocked-import fix-imports", () => {
  it("exports the combined import fix helper", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualType = typeof buildCombinedImportFixes;

    // Assert
    expect(actualType).toBe(expectedType);
  });

  it("returns no fixes when no matches are provided", () => {
    // Arrange
    const matches: [] = [];
    const fixer = {
      insertTextAfterRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "after",
      }),
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "before",
      }),
      replaceTextRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "replace",
      }),
    } as never;

    // Act
    const fixes = buildCombinedImportFixes(matches as never, fixer);

    // Assert
    expect(fixes).toStrictEqual([]);
  });

  it("merges deferred insert and update plans across matches", () => {
    // Arrange
    const matches = [
      {
        importPlan: {
          moduleSpecifier: "./alpha",
          names: ["beta"],
        },
        moduleSpecifier: "./alpha",
        newline: "\n",
      },
      {
        importPlan: {
          insert: { afterRange: [10, 20] },
          moduleSpecifier: "./alpha",
          names: ["alpha"],
        },
        moduleSpecifier: "./alpha",
        newline: "\n",
      },
      {
        importPlan: {
          moduleSpecifier: "./delta",
          names: ["zeta"],
        },
        moduleSpecifier: "./delta",
        newline: "\n",
      },
      {
        importPlan: {
          moduleSpecifier: "./delta",
          names: ["eta"],
          update: {
            existingNamedImports: ["theta"],
            range: [30, 40],
          },
        },
        moduleSpecifier: "./delta",
        newline: "\n",
      },
    ];
    const fixer = {
      insertTextAfterRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "after",
      }),
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "before",
      }),
      replaceTextRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "replace",
      }),
    } as never;

    // Act
    const fixes = buildCombinedImportFixes(matches as never, fixer);

    // Assert
    expect(fixes).toStrictEqual([
      {
        range: [30, 40],
        text: 'import { eta, theta, zeta } from "./delta";',
        type: "replace",
      },
      {
        range: [10, 20],
        text: '\nimport { alpha, beta } from "./alpha";',
        type: "after",
      },
    ]);
  });
});
