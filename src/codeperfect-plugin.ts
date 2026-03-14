import type { Linter, Rule } from "eslint";

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
  requireAaaSectionsRule,
  requireActResultCaptureRule,
  requireExampleLanguageRule,
  requireTestCompanionRule,
  singleActStatementRule,
  singleLineJsdocRule,
} from "./rules";

/** Rule registry exposed by the package plugin. */
const codeperfectRules = {
  "assert-actual-expected-names": assertActualExpectedNamesRule,
  "barrel-files-exports-only": barrelFilesExportsOnlyRule,
  "consistent-barrel-files": consistentBarrelFilesRule,
  "enforce-aaa-phase-purity": enforceAaaPhasePurityRule,
  "enforce-aaa-structure": enforceAaaStructureRule,
  "no-interface-member-docs": noInterfaceMemberDocumentationRule,
  "no-multiple-declarators": noMultipleDeclaratorsRule,
  "no-reexports-outside-barrels": noReexportsOutsideBarrelsRule,
  "prefer-interface-types": preferInterfaceTypesRule,
  "prefer-vi-mocked-import": preferViMockedImportRule,
  "require-aaa-sections": requireAaaSectionsRule,
  "require-act-result-capture": requireActResultCaptureRule,
  "require-example-language": requireExampleLanguageRule,
  "require-test-companion": requireTestCompanionRule,
  "single-act-statement": singleActStatementRule,
  "single-line-jsdoc": singleLineJsdocRule,
} as const satisfies Record<string, Rule.RuleModule>;

/** ESLint plugin object exported by the package. */
const codeperfectPlugin = {
  meta: {
    name: "@codeperfect/eslint-plugin",
  },
  rules: codeperfectRules,
} satisfies NonNullable<Linter.Config["plugins"]>[string];

export { codeperfectPlugin, codeperfectRules };
