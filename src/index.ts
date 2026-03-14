/* v8 ignore file */

export {
  codeperfectPlugin,
  codeperfectPlugin as default,
} from "./codeperfect-plugin";
export { aaa, all, architecture, core, docs, testing } from "./presets";
export { customRules } from "./custom-rules";
export type { CustomRuleEntry } from "./custom-rules";
export {
  assertActualExpectedNamesRule,
  barrelFilesExportsOnlyRule,
  consistentBarrelFilesRule,
  enforceAaaPhasePurityRule,
  enforceAaaStructureRule,
  noInterfaceMemberDocumentationRule,
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
