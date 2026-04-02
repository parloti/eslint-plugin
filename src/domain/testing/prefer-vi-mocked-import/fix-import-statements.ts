import type { Rule } from "eslint";

import type { RuleMatch } from "./types";

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

  const sortedNames = [...names].toSorted();
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
 * const fixes = buildImportInsertFixes({ importPlan: { moduleSpecifier: "./x", names: [] }, newline: "\n" } as never, [], {} as never);
 * void fixes;
 * ```
 */
function buildImportInsertFixes(
  match: RuleMatch,
  sortedNames: string[],
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  const statementText = buildImportStatement(
    match.importPlan.moduleSpecifier,
    void 0,
    sortedNames,
  );
  const { afterRange } = match.importPlan.insert ?? {};

  return afterRange === void 0
    ? [
        fixer.insertTextBeforeRange(
          [0, 0],
          `${statementText}${match.newline}${match.newline}`,
        ),
      ]
    : [
        fixer.insertTextAfterRange(
          afterRange,
          `${match.newline}${statementText}`,
        ),
      ];
}

/**
 * Creates an import statement string from import parts.
 * @param moduleSpecifier Module path used in the generated statement.
 * @param defaultImportName Existing default-import local identifier, when present.
 * @param names Named imports to include in braces.
 * @returns Fully formatted import statement text.
 * @example
 * ```typescript
 * const text = buildImportStatement("./x", void 0, ["a"]);
 * void text;
 * ```
 */
function buildImportStatement(
  moduleSpecifier: string,
  defaultImportName: string | undefined,
  names: readonly string[],
): string {
  const moduleText = JSON.stringify(moduleSpecifier);
  const namedText = `{ ${names.join(", ")} }`;

  return defaultImportName === void 0
    ? `import ${namedText} from ${moduleText};`
    : `import ${defaultImportName}, ${namedText} from ${moduleText};`;
}

/**
 * Builds an import update fix when an existing import is compatible.
 * @param match Autofix context produced by the matcher.
 * @param sortedNames Sorted names that must be imported.
 * @param fixer ESLint fixer.
 * @returns Replacement fix when an import can be updated.
 * @example
 * ```typescript
 * const fix = buildImportUpdateFix({ importPlan: { moduleSpecifier: "./x", names: [] } } as never, [], {} as never);
 * void fix;
 * ```
 */
function buildImportUpdateFix(
  match: RuleMatch,
  sortedNames: string[],
  fixer: Rule.RuleFixer,
): Rule.Fix | undefined {
  const { moduleSpecifier, update } = match.importPlan;

  if (update === void 0) {
    return void 0;
  }

  const { defaultImportName, existingNamedImports, range } = update;
  const mergedNames = [
    ...new Set([...sortedNames, ...existingNamedImports]),
  ].toSorted();
  const statementText = buildImportStatement(
    moduleSpecifier,
    defaultImportName,
    mergedNames,
  );

  return fixer.replaceTextRange(range, statementText);
}

export { buildImportFixes, buildImportStatement };
