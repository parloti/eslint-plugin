import { describe, expect, it } from "vitest";

import {
  buildImportFixes,
  buildImportStatement,
} from "./fix-import-statements";

describe("prefer-vi-mocked-import fix-import-statements", () => {
  it("exports the single-match import helpers", () => {
    // Arrange
    const expectedType = "function";

    // Act
    const actualTypes = {
      buildImportFixes: typeof buildImportFixes,
      buildImportStatement: typeof buildImportStatement,
    };

    // Assert
    expect(actualTypes.buildImportFixes).toBe(expectedType);
    expect(actualTypes.buildImportStatement).toBe(expectedType);
  });

  it("inserts new imports at the top of the file when no anchor exists", () => {
    // Arrange
    const match = {
      importPlan: {
        moduleSpecifier: "./dependencies",
        names: ["installDevelopmentDependencies"],
      },
      newline: "\n",
    } as never;
    const fixer = {
      insertTextBeforeRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "before",
      }),
    } as never;

    // Act
    const fixes = buildImportFixes(match, fixer);

    // Assert
    expect(fixes).toStrictEqual([
      {
        range: [0, 0],
        text: 'import { installDevelopmentDependencies } from "./dependencies";\n\n',
        type: "before",
      },
    ]);
  });

  it("inserts after an existing import anchor when one is available", () => {
    // Arrange
    const match = {
      importPlan: {
        insert: { afterRange: [10, 20] },
        moduleSpecifier: "./dependencies",
        names: ["installDevelopmentDependencies"],
      },
      newline: "\n",
    } as never;
    const fixer = {
      insertTextAfterRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "after",
      }),
    } as never;

    // Act
    const fixes = buildImportFixes(match, fixer);

    // Assert
    expect(fixes).toStrictEqual([
      {
        range: [10, 20],
        text: '\nimport { installDevelopmentDependencies } from "./dependencies";',
        type: "after",
      },
    ]);
  });

  it("updates compatible imports in place", () => {
    // Arrange
    const match = {
      importPlan: {
        moduleSpecifier: "./dependencies",
        names: ["installDevelopmentDependencies"],
        update: {
          defaultImportName: "dependencies",
          existingNamedImports: ["otherDependency"],
          range: [5, 25],
        },
      },
    } as never;
    const fixer = {
      replaceTextRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "replace",
      }),
    } as never;

    // Act
    const fixes = buildImportFixes(match, fixer);

    // Assert
    expect(fixes).toStrictEqual([
      {
        range: [5, 25],
        text: 'import dependencies, { installDevelopmentDependencies, otherDependency } from "./dependencies";',
        type: "replace",
      },
    ]);
  });
});
