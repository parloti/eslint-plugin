import type { Rule } from "eslint";

import type { Range } from "./match-helpers";
import type { RuleMatch } from "./types";

import { buildImportFixes } from "./fix-import-statements";
import { buildCombinedImportFixes } from "./fix-imports";

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
    ...buildImportFixes(match, fixer),
    ...buildNonImportFixes(match, fixer),
  ];
}

/**
 * Builds all autofix operations for every match in a file.
 * @param matches Autofix contexts produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Combined fix list.
 * @example
 * ```typescript
 * const fixes = buildFixes([], {} as never);
 * void fixes;
 * ```
 */
function buildFixes(matches: RuleMatch[], fixer: Rule.RuleFixer): Rule.Fix[] {
  return [
    ...buildCombinedImportFixes(matches, fixer),
    ...matches.flatMap((match) => buildNonImportFixes(match, fixer)),
  ];
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
 * Builds all non-import autofix operations for a single match.
 * @param match Autofix context produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Combined non-import fix list.
 * @example
 * ```typescript
 * const fixes = buildNonImportFixes({} as never, {} as never);
 * void fixes;
 * ```
 */
function buildNonImportFixes(
  match: RuleMatch,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  return [
    ...buildBindingFixes(match, fixer),
    ...buildMemberRewriteFixes(match, fixer),
    ...buildMockSpecifierFixes(match, fixer),
    ...buildRemovalFixes(match, fixer),
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

export { buildFix, buildFixes };
