import type { Rule } from "eslint";

import { buildImportStatement } from "./fix-import-statements";

/** Combined import work for one module across all matches. */
interface CombinedImportPlanLike {
  /** Module imported by this plan. */
  moduleSpecifier: string;
  /** Named imports required for this module. */
  names: Set<string>;
  /** Existing import replacement plan when present. */
  update?: {
    /** Existing default import local name. */
    defaultImportName?: string;
    /** Existing named imports already present. */
    existingNamedImports: string[];
    /** Import range to replace. */
    range: [number, number];
  };
}

/**
 * Builds replacement fixes for existing compatible imports.
 * @param combinedPlans Combined plans keyed by module specifier.
 * @param fixer ESLint fixer.
 * @returns Replacement fixes for existing imports.
 * @example
 * ```typescript
 * const fixes = buildCombinedUpdateFixes(new Map(), {} as never);
 * void fixes;
 * ```
 */
function buildCombinedUpdateFixes(
  combinedPlans: Map<string, CombinedImportPlanLike>,
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  return [...combinedPlans.values()].flatMap((plan) => {
    const updateFix = toCombinedUpdateFix(plan, fixer);

    return updateFix === void 0 ? [] : [updateFix];
  });
}

/**
 * Builds a replacement fix for one combined update plan.
 * @param plan Combined import plan for one module.
 * @param fixer ESLint fixer.
 * @returns Replacement fix when the module already has a compatible import.
 * @example
 * ```typescript
 * const fix = toCombinedUpdateFix({ moduleSpecifier: "./x", names: new Set() } as never, {} as never);
 * void fix;
 * ```
 */
function toCombinedUpdateFix(
  plan: CombinedImportPlanLike,
  fixer: Rule.RuleFixer,
): Rule.Fix | undefined {
  const { moduleSpecifier, names, update } = plan;

  if (update === void 0) {
    return void 0;
  }

  const { defaultImportName, existingNamedImports, range } = update;
  const mergedNames = [
    ...new Set([...names, ...existingNamedImports]),
  ].toSorted();
  const statementText = buildImportStatement(
    moduleSpecifier,
    defaultImportName,
    mergedNames,
  );

  return fixer.replaceTextRange(range, statementText);
}

export { buildCombinedUpdateFixes };
