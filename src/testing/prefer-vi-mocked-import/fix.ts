import type { Rule } from "eslint";

import type { RuleMatch } from "./types";
/** Type definition for rule data. */
type Range = [number, number];

/**
 * Builds fixes that inline declaration initializers into factory properties.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Binding-related fixes.
 * @example
 * ```typescript
 * const fixes = buildBindingFixes({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildBindingFixes(
  match: RuleMatch,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  return match.bindings.flatMap((binding) => {
    const declaration = match.declarations.get(binding.localName);
    if (declaration === void 0) {
      return [];
    }
    const initializerText = match.sourceText.slice(
      declaration.initializerRange[0],
      declaration.initializerRange[1],
    );
    return [
      fixer.replaceTextRange(
        binding.propertyRange,
        `${binding.exportedName}: ${initializerText}`,
      ),
    ];
  });
}

/**
 * Builds all autofix operations for a single match.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Combined fix list.
 * @example
 * ```typescript
 * const fixes = buildFix({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildFix(match: RuleMatch, fixer: Rule.RuleFixer): Rule.Fix[] {
  return [
    ...buildBindingFixes(match, fixer),
    ...buildMemberRewriteFixes(match, fixer),
    ...buildMockSpecifierFixes(match, fixer),
    ...buildImportFixes(match, fixer),
    ...buildRemovalFixes(match, fixer),
  ];
}

/**
 * Builds fixes for adding or updating imports.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns A fix list that keeps import declarations consistent.
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
 * @returns Fixes that insert a new import declaration.
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
 * @returns A single replacement fix when an import can be updated.
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
  const { update } = match.importPlan;
  if (update === void 0) {
    return void 0;
  }

  const { moduleSpecifier } = match.importPlan;
  const mergedNames = [
    ...new Set([...sortedNames, ...update.existingNamedImports]),
  ].toSorted();
  const statementText = buildImportStatement(
    moduleSpecifier,
    update.defaultImportName,
    mergedNames,
  );
  return fixer.replaceTextRange(update.range, statementText);
}

/**
 * Builds fixes for `mock*` member-expression object rewrites.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Replacements for member-expression object identifiers.
 * @example
 * ```typescript
 * const fixes = buildMemberRewriteFixes({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildMemberRewriteFixes(
  match: RuleMatch,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  return match.memberRewrites.map((rewrite) =>
    fixer.replaceTextRange(
      rewrite.localObjectRange,
      `vi.mocked(${rewrite.exportedName})`,
    ),
  );
}

/**
 * Builds a fix that converts literal mock specifiers to `import("...")`.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Fixes that normalize the mock specifier argument.
 * @example
 * ```typescript
 * const fixes = buildMockSpecifierFixes({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildMockSpecifierFixes(
  match: RuleMatch,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  if (match.mockSpecifierIsImportExpression) {
    return [];
  }

  const moduleText = JSON.stringify(match.moduleSpecifier);
  return [
    fixer.replaceTextRange(match.mockSpecifierRange, `import(${moduleText})`),
  ];
}

/**
 * Builds fixes that remove declarations after inlining.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Fixes that remove redundant declaration statements.
 * @example
 * ```typescript
 * const fixes = buildRemovalFixes({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildRemovalFixes(
  match: RuleMatch,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  const uniqueRanges = getUniqueStatementRanges(match);
  return uniqueRanges.map((statementRange) => {
    const expandedRange = extendRangeToLineBreak(
      match.sourceText,
      statementRange,
    );
    return fixer.removeRange(expandedRange);
  });
}

/**
 * Extends a statement range to include the trailing line break.
 * @param sourceText Full file content for newline lookup.
 * @param statementRange Start/end offsets for the statement.
 * @returns Statement range extended through the trailing line break.
 * @example
 * ```typescript
 * const range = extendRangeToLineBreak("a\n", [0, 1]);
 * void range;
 * ```
 */
function extendRangeToLineBreak(
  sourceText: string,
  statementRange: Range,
): Range {
  const [start, end] = statementRange;
  const nextLineFeedIndex = sourceText.indexOf("\n", end);
  return nextLineFeedIndex === -1
    ? [start, sourceText.length]
    : [start, nextLineFeedIndex + 1];
}

/**
 * Returns sorted unique statement ranges for declarations to remove.
 * @param match Autofix context produced by the matcher.
 * @returns Distinct declaration statement ranges to remove.
 * @example
 * ```typescript
 * const ranges = getUniqueStatementRanges({ bindings: [], declarations: new Map() } as never);
 * void ranges;
 * ```
 */
function getUniqueStatementRanges(match: RuleMatch): Range[] {
  const rangeMap = new Map<string, Range>();
  for (const binding of match.bindings) {
    const declaration = match.declarations.get(binding.localName);
    if (declaration !== void 0) {
      const key = `${declaration.statementRange[0]}:${declaration.statementRange[1]}`;
      rangeMap.set(key, declaration.statementRange);
    }
  }

  return [...rangeMap.values()];
}

export { buildFix };
