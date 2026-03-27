import type { Linter } from "eslint";

import { codeperfectPlugin, codeperfectRules } from "./codeperfect-plugin";

/**
 *
 */
type CodeperfectPreset = Pick<Linter.Config, "plugins" | "rules">;

/**
 *
 */
type CodeperfectRuleEntries = Partial<
  Record<CodeperfectRuleKey, Linter.RuleEntry>
>;

/**
 *
 */
type CodeperfectRuleKey = `codeperfect/${CodeperfectRuleName}`;

/**
 *
 */
type CodeperfectRuleName = keyof typeof codeperfectRules;

/**
 *
 */
const architectureRuleNames = [
  "barrel-files-exports-only",
  "consistent-barrel-files",
  "no-reexports-outside-barrels",
] as const satisfies readonly CodeperfectRuleName[];

/**
 *
 */
const coreRuleNames = [
  "no-multiple-declarators",
  "prefer-interface-types",
] as const satisfies readonly CodeperfectRuleName[];

/**
 *
 */
const docsRuleNames = [
  "no-interface-member-docs",
  "require-example-language",
  "single-line-jsdoc",
] as const satisfies readonly CodeperfectRuleName[];

/**
 *
 */
const aaaRuleNames = [
  "enforce-aaa-phase-purity",
  "enforce-aaa-structure",
  "require-aaa-sections",
] as const satisfies readonly CodeperfectRuleName[];

/**
 *
 */
const testingRuleNames = [
  "assert-actual-expected-names",
  "enforce-aaa-phase-purity",
  "enforce-aaa-structure",
  "prefer-vi-mocked-import",
  "prefer-vitest-incremental-casts",
  "require-aaa-sections",
  "require-act-result-capture",
  "require-test-companion",
  "single-act-statement",
] as const satisfies readonly CodeperfectRuleName[];

/**
 *
 */
const allRuleNames = Object.keys(codeperfectRules) as CodeperfectRuleName[];

/**
 * @param ruleNames
 * @example
 */
function createPreset(
  ruleNames: readonly CodeperfectRuleName[],
): CodeperfectPreset {
  return {
    plugins: {
      codeperfect: codeperfectPlugin,
    },
    rules: createRules(ruleNames),
  };
}

/**
 * @param ruleNames
 * @example
 */
function createRules(
  ruleNames: readonly CodeperfectRuleName[],
): CodeperfectRuleEntries {
  return Object.fromEntries(
    ruleNames.map((ruleName) => [`codeperfect/${ruleName}`, "error"]),
  ) as CodeperfectRuleEntries;
}

/**
 *
 */
const all = createPreset(allRuleNames);

/**
 *
 */
const architecture = createPreset(architectureRuleNames);

/**
 *
 */
const core = createPreset(coreRuleNames);

/**
 *
 */
const docs = createPreset(docsRuleNames);

/**
 *
 */
const testing = createPreset(testingRuleNames);

/**
 *
 */
const aaa = createPreset(aaaRuleNames);

export { aaa, all, architecture, core, docs, testing };
export type { CodeperfectPreset };
