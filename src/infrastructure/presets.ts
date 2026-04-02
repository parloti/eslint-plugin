import type { Linter } from "eslint";

import { codeperfectPlugin, codeperfectRules } from "./codeperfect-plugin";

/** Represents a ready-to-use preset exported by the package. */
type CodeperfectPreset = Pick<Linter.Config, "plugins" | "rules">;

/** Represents the enabled rule entries inside a preset. */
type CodeperfectRuleEntries = Partial<
  Record<CodeperfectRuleKey, Linter.RuleEntry>
>;

/** Namespaces a package-owned rule under the `codeperfect/` prefix. */
type CodeperfectRuleKey = `codeperfect/${CodeperfectRuleName}`;

/** Enumerates the package-owned rule names. */
type CodeperfectRuleName = keyof typeof codeperfectRules;

/** Rule names grouped into the architecture preset. */
const architectureRuleNames = [
  "barrel-files-exports-only",
  "consistent-barrel-files",
  "no-reexports-outside-barrels",
] as const satisfies readonly CodeperfectRuleName[];

/** Rule names grouped into the core preset. */
const coreRuleNames = [
  "no-multiple-declarators",
  "prefer-interface-types",
] as const satisfies readonly CodeperfectRuleName[];

/** Rule names grouped into the documentation preset. */
const documentationRuleNames = [
  "no-interface-member-docs",
  "require-example-language",
  "single-line-jsdoc",
] as const satisfies readonly CodeperfectRuleName[];

/** Rule names grouped into the AAA-focused preset. */
const aaaRuleNames = [
  "enforce-aaa-phase-purity",
  "enforce-aaa-structure",
  "require-aaa-sections",
] as const satisfies readonly CodeperfectRuleName[];

/** Rule names grouped into the broader testing preset. */
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

/** Rule names used by the all-rules preset. */
const allRuleNames = Object.keys(codeperfectRules) as CodeperfectRuleName[];

/**
 * Creates a preset for the provided rule names.
 * @param ruleNames Rule names to enable.
 * @returns ESLint preset containing the package plugin and enabled rules.
 * @example
 * ```typescript
 * const preset = createPreset(["no-multiple-declarators"]);
 * ```
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
 * Creates the rule entry map for a preset.
 * @param ruleNames Rule names to enable.
 * @returns Rule entry map keyed by `codeperfect/` rule name.
 * @example
 * ```typescript
 * const rules = createRules(["prefer-interface-types"]);
 * ```
 */
function createRules(
  ruleNames: readonly CodeperfectRuleName[],
): CodeperfectRuleEntries {
  return Object.fromEntries(
    ruleNames.map((ruleName) => [`codeperfect/${ruleName}`, "error"]),
  ) as CodeperfectRuleEntries;
}

/** Preset that enables every package-owned rule. */
const all = createPreset(allRuleNames);

/** Preset that enables architecture-focused rules. */
const architecture = createPreset(architectureRuleNames);

/** Preset that enables core rules. */
const core = createPreset(coreRuleNames);

/** Preset that enables documentation rules. */
const documentation = createPreset(documentationRuleNames);

/** Preset that enables testing rules. */
const testing = createPreset(testingRuleNames);

/** Preset that enables AAA-specific testing rules. */
const aaa = createPreset(aaaRuleNames);

export { aaa, all, architecture, core, documentation, testing };
export type { CodeperfectPreset };
