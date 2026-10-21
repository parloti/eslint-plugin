import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import type { RuleMatch } from "./types";

import { buildImportStatement } from "./fix-import-statements";

/**
 * Builds fixes for adding or updating imports.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Import fixes for one match.
 * @example
 * ```typescript
 * const fixes = buildImportFixes({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildImportFixes(match: RuleMatch, fixer: Rule.RuleFixer): Rule.Fix[] {
  const { names } = match.importPlan;

  if (names.length === 0) {
    return [];
  }

  const sortedNames = [...names].toSorted((left, right) =>
    left === right ? 0 : left < right ? -1 : 1,
  );
  const updateFix = buildImportUpdateFix(match, sortedNames, fixer);

  return updateFix === void 0
    ? buildImportInsertFixes(match, sortedNames, fixer)
    : [updateFix];
}

/**
 * Builds import insertion fixes when no compatible import exists.
 * @param match Autofix context produced by the matcher.
 * @param sortedNames Sorted names that must be imported.
 * @param fixer ESLint fixer.
 * @returns Import insertion fixes for one match.
 * @example
 * ```typescript
 * const fixes = buildImportInsertFixes({ importPlan: { names: [] }, moduleSpecifier: "./x", newline: "\n" } as never, [], {} as never);
 * void fixes;
 * ```
 */
function buildImportInsertFixes(
  match: RuleMatch,
  sortedNames: string[],
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  const statementText = buildImportStatement(
    match.moduleSpecifier,
    void 0,
    sortedNames,
  );
  const { afterRange } = match.importPlan.insert ?? {};

  return [
    afterRange === void 0
      ? fixer.insertTextBeforeRange(
          [0, 0],
          `${statementText}${match.newline}${match.newline}`,
        )
      : fixer.insertTextAfterRange(
          afterRange,
          `${match.newline}${statementText}`,
        ),
  ];
}

/**
 * Builds an import update fix when an existing import is compatible.
 * @param match Autofix context produced by the matcher.
 * @param sortedNames Sorted names that must be imported.
 * @param fixer ESLint fixer.
 * @returns Replacement fix when an import can be updated.
 * @example
 * ```typescript
 * const fix = buildImportUpdateFix({ importPlan: { names: [] }, moduleSpecifier: "./x" } as never, [], {} as never);
 * void fix;
 * ```
 */
function buildImportUpdateFix(
  match: RuleMatch,
  sortedNames: string[],
  fixer: Rule.RuleFixer,
): Rule.Fix | undefined {
  const { update } = match.importPlan;

  if (update === void 0) {
    return void 0;
  }

  const { defaultImportName, existingNamedImports, range } = update;
  const mergedNames = [
    ...new Set([...sortedNames, ...existingNamedImports]),
  ].toSorted((left, right) => (left === right ? 0 : left < right ? -1 : 1));
  const statementText = buildImportStatement(
    match.moduleSpecifier,
    defaultImportName,
    mergedNames,
  );

  return fixer.replaceTextRange(range, statementText);
}

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
      importPlan: { names: ["installDevelopmentDependencies"] },
      moduleSpecifier: "./dependencies",
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
    const actualFixes = buildImportFixes(match, fixer);

    // Assert
    expect(actualFixes).toStrictEqual([
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
        names: ["installDevelopmentDependencies"],
      },
      moduleSpecifier: "./dependencies",
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
    const actualFixes = buildImportFixes(match, fixer);

    // Assert
    expect(actualFixes).toStrictEqual([
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
        names: ["installDevelopmentDependencies"],
        update: {
          defaultImportName: "dependencies",
          existingNamedImports: ["otherDependency"],
          range: [5, 25],
        },
      },
      moduleSpecifier: "./dependencies",
    } as never;
    const fixer = {
      replaceTextRange: (range: [number, number], text: string) => ({
        range,
        text,
        type: "replace",
      }),
    } as never;

    // Act
    const actualFixes = buildImportFixes(match, fixer);

    // Assert
    expect(actualFixes).toStrictEqual([
      {
        range: [5, 25],
        text: 'import dependencies, { installDevelopmentDependencies, otherDependency } from "./dependencies";',
        type: "replace",
      },
    ]);
  });
});
