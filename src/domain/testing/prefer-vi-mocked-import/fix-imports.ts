import type { Rule } from "eslint";

import type { Range } from "./match-helpers";
import type { RuleMatch } from "./types";

import { buildImportStatement } from "./fix-import-statements";
import { buildCombinedUpdateFixes } from "./fix-import-updates";

/** Combined import work for one module across all matches. */
interface CombinedImportPlan {
  /** Insert location for a new import. */
  afterRange?: Range;
  /** Module imported by this plan. */
  moduleSpecifier: string;
  /** Named imports required for this module. */
  names: Set<string>;
  /** Existing import replacement plan when present. */
  update?: NonNullable<RuleMatch["importPlan"]["update"]>;
}

/** Import statements grouped by insertion point. */
interface InsertGroup {
  /** Insert location for this group. */
  afterRange?: Range;
  /** Statements emitted at the same insertion point. */
  statements: string[];
}

/**
 * Adds one import statement to its insertion group.
 * @param insertGroups Import statements grouped by insertion point.
 * @param plan Combined import plan for one module.
 * @example
 * ```typescript
 * addInsertStatement(new Map(), { moduleSpecifier: "./x", names: new Set(["a"]) } as never);
 * ```
 */
function addInsertStatement(
  insertGroups: Map<string, InsertGroup>,
  plan: CombinedImportPlan,
): void {
  const sortedNames = [...plan.names].toSorted();

  if (sortedNames.length === 0 || plan.update !== void 0) {
    return;
  }

  const key = getInsertGroupKey(plan.afterRange);
  const group = insertGroups.get(key) ?? createInsertGroup(plan.afterRange);

  group.statements.push(
    buildImportStatement(plan.moduleSpecifier, void 0, sortedNames),
  );
  group.statements.sort((left, right) => left.localeCompare(right));
  insertGroups.set(key, group);
}

/**
 * Builds shared import fixes for every file match.
 * @param matches Autofix contexts produced by the matcher.
 * @param fixer ESLint fixer.
 * @returns Import fixes de-duplicated by module and insertion site.
 * @example
 * ```typescript
 * const fixes = buildCombinedImportFixes([], {} as never);
 * void fixes;
 * ```
 */
function buildCombinedImportFixes(
  matches: RuleMatch[],
  fixer: Rule.RuleFixer,
): Rule.Fix[] {
  const newline = matches[0]?.newline ?? "\n";
  const combinedPlans = combineImportPlans(matches);
  const insertGroups = collectInsertGroups(combinedPlans);

  return [
    ...buildCombinedUpdateFixes(combinedPlans, fixer),
    ...buildInsertGroupFixes(insertGroups, fixer, newline),
  ];
}

/**
 * Builds grouped insertion fixes for new imports.
 * @param insertGroups Import statements grouped by insertion site.
 * @param fixer ESLint fixer.
 * @param newline Preferred file newline.
 * @returns Insert fixes for new imports.
 * @example
 * ```typescript
 * const fixes = buildInsertGroupFixes(new Map(), {} as never, "\n");
 * void fixes;
 * ```
 */
function buildInsertGroupFixes(
  insertGroups: Map<string, InsertGroup>,
  fixer: Rule.RuleFixer,
  newline: "\n" | "\r\n",
): Rule.Fix[] {
  return [...insertGroups.values()].map((group) =>
    group.afterRange === void 0
      ? fixer.insertTextBeforeRange(
          [0, 0],
          `${group.statements.join(newline)}${newline}${newline}`,
        )
      : fixer.insertTextAfterRange(
          group.afterRange,
          `${newline}${group.statements.join(newline)}`,
        ),
  );
}

/**
 * Collects insert groups keyed by insertion point.
 * @param combinedPlans Combined plans keyed by module specifier.
 * @returns Import statements grouped by insertion point.
 * @example
 * ```typescript
 * const groups = collectInsertGroups(new Map());
 * void groups;
 * ```
 */
function collectInsertGroups(
  combinedPlans: Map<string, CombinedImportPlan>,
): Map<string, InsertGroup> {
  const insertGroups = new Map<string, InsertGroup>();

  for (const plan of combinedPlans.values()) {
    addInsertStatement(insertGroups, plan);
  }

  return insertGroups;
}

/**
 * Combines import plans across every file match.
 * @param matches Autofix contexts produced by the matcher.
 * @returns Combined plans keyed by module specifier.
 * @example
 * ```typescript
 * const plans = combineImportPlans([]);
 * void plans;
 * ```
 */
function combineImportPlans(
  matches: RuleMatch[],
): Map<string, CombinedImportPlan> {
  const combinedPlans = new Map<string, CombinedImportPlan>();

  for (const match of matches) {
    mergeImportPlan(combinedPlans, match);
  }

  return combinedPlans;
}

/**
 * Creates the initial combined plan for one match.
 * @param match Autofix context produced by the matcher.
 * @returns Combined import plan seed.
 * @example
 * ```typescript
 * const plan = createCombinedImportPlan({ moduleSpecifier: "./x", importPlan: { names: [] } } as never);
 * void plan;
 * ```
 */
function createCombinedImportPlan(match: RuleMatch): CombinedImportPlan {
  const combinedPlan: CombinedImportPlan = {
    moduleSpecifier: match.moduleSpecifier,
    names: new Set(match.importPlan.names),
  };

  if (match.importPlan.insert?.afterRange !== void 0) {
    combinedPlan.afterRange = match.importPlan.insert.afterRange;
  }

  if (match.importPlan.update !== void 0) {
    combinedPlan.update = match.importPlan.update;
  }

  return combinedPlan;
}

/**
 * Creates an insertion group for one location.
 * @param afterRange Insert location for the group.
 * @returns Insert group seed.
 * @example
 * ```typescript
 * const group = createInsertGroup(void 0);
 * void group;
 * ```
 */
function createInsertGroup(afterRange: Range | undefined): InsertGroup {
  return afterRange === void 0
    ? { statements: [] }
    : { afterRange, statements: [] };
}

/**
 * Creates a stable key for an insert location.
 * @param afterRange Insert location when a new import must be inserted.
 * @returns Stable key for the insertion site.
 * @example
 * ```typescript
 * const key = getInsertGroupKey(void 0);
 * void key;
 * ```
 */
function getInsertGroupKey(afterRange: Range | undefined): string {
  return afterRange === void 0 ? "TOP" : `${afterRange[0]}:${afterRange[1]}`;
}

/**
 * Merges one match into the combined import-plan map.
 * @param combinedPlans Combined plans keyed by module specifier.
 * @param match Autofix context produced by the matcher.
 * @example
 * ```typescript
 * mergeImportPlan(new Map(), {} as never);
 * ```
 */
function mergeImportPlan(
  combinedPlans: Map<string, CombinedImportPlan>,
  match: RuleMatch,
): void {
  const combinedPlan =
    combinedPlans.get(match.moduleSpecifier) ?? createCombinedImportPlan(match);

  mergeImportPlanInsertRange(combinedPlan, match);
  mergeImportPlanNames(combinedPlan, match.importPlan.names);
  mergeImportPlanUpdate(combinedPlan, match);
  combinedPlans.set(match.moduleSpecifier, combinedPlan);
}

/**
 * Merges the first discovered insert range for a module.
 * @param combinedPlan Combined plan for one module.
 * @param match Autofix context produced by the matcher.
 * @example
 * ```typescript
 * mergeImportPlanInsertRange({ moduleSpecifier: "./x", names: new Set() } as never, {} as never);
 * ```
 */
function mergeImportPlanInsertRange(
  combinedPlan: CombinedImportPlan,
  match: RuleMatch,
): void {
  if (
    combinedPlan.afterRange === void 0 &&
    match.importPlan.insert?.afterRange !== void 0
  ) {
    combinedPlan.afterRange = match.importPlan.insert.afterRange;
  }
}

/**
 * Merges discovered import names for a module.
 * @param combinedPlan Combined plan for one module.
 * @param names Additional import names.
 * @example
 * ```typescript
 * mergeImportPlanNames({ moduleSpecifier: "./x", names: new Set() } as never, ["a"]);
 * ```
 */
function mergeImportPlanNames(
  combinedPlan: CombinedImportPlan,
  names: string[],
): void {
  for (const name of names) {
    combinedPlan.names.add(name);
  }
}

/**
 * Merges the first discovered update plan for a module.
 * @param combinedPlan Combined plan for one module.
 * @param match Autofix context produced by the matcher.
 * @example
 * ```typescript
 * mergeImportPlanUpdate({ moduleSpecifier: "./x", names: new Set() } as never, {} as never);
 * ```
 */
function mergeImportPlanUpdate(
  combinedPlan: CombinedImportPlan,
  match: RuleMatch,
): void {
  if (combinedPlan.update === void 0 && match.importPlan.update !== void 0) {
    combinedPlan.update = match.importPlan.update;
  }
}

export { buildCombinedImportFixes };
