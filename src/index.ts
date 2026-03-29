export { codeperfectPlugin } from "./codeperfect-plugin";
export { customRules } from "./custom-rules";
export type { CustomRuleEntry } from "./custom-rules";
export {
  aaa,
  all,
  architecture,
  core,
  documentation,
  testing,
} from "./presets";
export type { CodeperfectPreset } from "./presets";
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
