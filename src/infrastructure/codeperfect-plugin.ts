import type { Linter, Rule } from "eslint";

import {
  assertActualExpectedNamesRule,
  barrelFilesExportsOnlyRule,
  consistentBarrelFilesRule,
  enforceAaaStructureRule,
  noImportExportAliasesRule,
  noImportExportExtensionsRule,
  noInterfaceMemberDocumentationRule,
  noMultipleDeclaratorsRule,
  noReexportsOutsideBarrelsRule,
  noUnusedExportsRule,
  preferInterfaceTypesRule,
  preferViMockedImportRule,
  requireActResultCaptureRule,
  requireExampleLanguageRule,
  requireTestCompanionRule,
  singleActStatementRule,
  singleLineJsdocRule,
} from "../application";

/** Rule registry exposed by the package plugin. */
const codeperfectRules = {
  "assert-actual-expected-names": assertActualExpectedNamesRule,
  "barrel-files-exports-only": barrelFilesExportsOnlyRule,
  "consistent-barrel-files": consistentBarrelFilesRule,
  "enforce-aaa-structure": enforceAaaStructureRule,
  "no-import-export-aliases": noImportExportAliasesRule,
  "no-import-export-extensions": noImportExportExtensionsRule,
  "no-interface-member-docs": noInterfaceMemberDocumentationRule,
  "no-multiple-declarators": noMultipleDeclaratorsRule,
  "no-reexports-outside-barrels": noReexportsOutsideBarrelsRule,
  "no-unused-exports": noUnusedExportsRule,
  "prefer-interface-types": preferInterfaceTypesRule,
  "prefer-vi-mocked-import": preferViMockedImportRule,
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
