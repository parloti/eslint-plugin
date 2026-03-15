import type { Rule } from "eslint";

import {
  assertActualExpectedNamesRule,
  barrelFilesExportsOnlyRule,
  consistentBarrelFilesRule,
  enforceAaaPhasePurityRule,
  enforceAaaStructureRule,
  noInterfaceMemberDocumentationRule,
  noMultipleDeclaratorsRule,
  noReexportsOutsideBarrelsRule,
  preferInterfaceTypesRule,
  preferViMockedImportRule,
  preferVitestIncrementalCastsRule,
  requireAaaSectionsRule,
  requireActResultCaptureRule,
  requireExampleLanguageRule,
  requireTestCompanionRule,
  singleActStatementRule,
  singleLineJsdocRule,
} from "./rules";

/** Internal registry entry for a package-owned custom rule. */
interface CustomRuleEntry {
  /** ESLint rule implementation. */
  rule: Rule.RuleModule;

  /** ESLint rule name without the plugin prefix. */
  ruleName: string;
}

/** Source-of-truth registry for all package-owned custom rules. */
const customRules = [
  {
    rule: assertActualExpectedNamesRule,
    ruleName: "assert-actual-expected-names",
  },
  {
    rule: barrelFilesExportsOnlyRule,
    ruleName: "barrel-files-exports-only",
  },
  {
    rule: consistentBarrelFilesRule,
    ruleName: "consistent-barrel-files",
  },
  {
    rule: enforceAaaPhasePurityRule,
    ruleName: "enforce-aaa-phase-purity",
  },
  {
    rule: enforceAaaStructureRule,
    ruleName: "enforce-aaa-structure",
  },
  {
    rule: noReexportsOutsideBarrelsRule,
    ruleName: "no-reexports-outside-barrels",
  },
  {
    rule: noMultipleDeclaratorsRule,
    ruleName: "no-multiple-declarators",
  },
  {
    rule: preferInterfaceTypesRule,
    ruleName: "prefer-interface-types",
  },
  {
    rule: noInterfaceMemberDocumentationRule,
    ruleName: "no-interface-member-docs",
  },
  {
    rule: requireExampleLanguageRule,
    ruleName: "require-example-language",
  },
  {
    rule: singleLineJsdocRule,
    ruleName: "single-line-jsdoc",
  },
  {
    rule: preferViMockedImportRule,
    ruleName: "prefer-vi-mocked-import",
  },
  {
    rule: preferVitestIncrementalCastsRule,
    ruleName: "prefer-vitest-incremental-casts",
  },
  {
    rule: requireAaaSectionsRule,
    ruleName: "require-aaa-sections",
  },
  {
    rule: requireActResultCaptureRule,
    ruleName: "require-act-result-capture",
  },
  {
    rule: requireTestCompanionRule,
    ruleName: "require-test-companion",
  },
  {
    rule: singleActStatementRule,
    ruleName: "single-act-statement",
  },
] as const satisfies readonly CustomRuleEntry[];

export { customRules };
export type { CustomRuleEntry };
