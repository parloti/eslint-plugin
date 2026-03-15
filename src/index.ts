export {
  codeperfectPlugin,
  codeperfectPlugin as default,
} from "./codeperfect-plugin";
export { aaa, all, architecture, core, docs, testing } from "./presets";
export type { CodeperfectPreset } from "./presets";
export { customRules } from "./custom-rules";
export type { CustomRuleEntry } from "./custom-rules";
export {
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
