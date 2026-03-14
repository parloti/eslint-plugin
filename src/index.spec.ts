import { describe, expect, it } from "vitest";

import {
  aaa,
  all,
  architecture,
  assertActualExpectedNamesRule,
  barrelFilesExportsOnlyRule,
  codeperfectPlugin,
  consistentBarrelFilesRule,
  core,
  customRules,
  docs,
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
  testing,
} from "./index";

describe("package entrypoint", () => {
  it("exports the plugin as the default and named root export", async () => {
    const moduleExports = await import("./index");

    expect(moduleExports.default).toBe(codeperfectPlugin);
    expect(moduleExports.codeperfectPlugin).toBe(codeperfectPlugin);
  });

  it("exports the package-owned rules and registry", () => {
    expect(customRules.map((entry) => entry.ruleName)).toStrictEqual([
      "assert-actual-expected-names",
      "barrel-files-exports-only",
      "consistent-barrel-files",
      "enforce-aaa-phase-purity",
      "enforce-aaa-structure",
      "no-reexports-outside-barrels",
      "prefer-interface-types",
      "no-interface-member-docs",
      "require-example-language",
      "single-line-jsdoc",
      "prefer-vi-mocked-import",
      "require-aaa-sections",
      "require-act-result-capture",
      "require-test-companion",
      "single-act-statement",
    ]);

    expect(codeperfectPlugin.rules?.["assert-actual-expected-names"]).toBe(
      assertActualExpectedNamesRule,
    );
    expect(codeperfectPlugin.rules?.["barrel-files-exports-only"]).toBe(
      barrelFilesExportsOnlyRule,
    );
    expect(codeperfectPlugin.rules?.["consistent-barrel-files"]).toBe(
      consistentBarrelFilesRule,
    );
    expect(codeperfectPlugin.rules?.["enforce-aaa-phase-purity"]).toBe(
      enforceAaaPhasePurityRule,
    );
    expect(codeperfectPlugin.rules?.["enforce-aaa-structure"]).toBe(
      enforceAaaStructureRule,
    );
    expect(codeperfectPlugin.rules?.["no-reexports-outside-barrels"]).toBe(
      noReexportsOutsideBarrelsRule,
    );
    expect(codeperfectPlugin.rules?.["prefer-interface-types"]).toBe(
      preferInterfaceTypesRule,
    );
    expect(codeperfectPlugin.rules?.["no-interface-member-docs"]).toBe(
      noInterfaceMemberDocumentationRule,
    );
    expect(codeperfectPlugin.rules?.["require-example-language"]).toBe(
      requireExampleLanguageRule,
    );
    expect(codeperfectPlugin.rules?.["single-line-jsdoc"]).toBe(
      singleLineJsdocRule,
    );
    expect(codeperfectPlugin.rules?.["prefer-vi-mocked-import"]).toBe(
      preferViMockedImportRule,
    );
    expect(codeperfectPlugin.rules?.["require-aaa-sections"]).toBe(
      requireAaaSectionsRule,
    );
    expect(codeperfectPlugin.rules?.["require-act-result-capture"]).toBe(
      requireActResultCaptureRule,
    );
    expect(codeperfectPlugin.rules?.["require-test-companion"]).toBe(
      requireTestCompanionRule,
    );
    expect(codeperfectPlugin.rules?.["single-act-statement"]).toBe(
      singleActStatementRule,
    );
  });

  it("exports the ready-to-use presets", async () => {
    const moduleExports = await import("./index");

    expect(moduleExports.all).toBe(all);
    expect(moduleExports.architecture).toBe(architecture);
    expect(moduleExports.core).toBe(core);
    expect(moduleExports.docs).toBe(docs);
    expect(moduleExports.testing).toBe(testing);
    expect(moduleExports.aaa).toBe(aaa);
  });

  it("does not expose legacy config factory exports", async () => {
    const moduleExports = await import("./index");

    expect("config" in moduleExports).toBe(false);
    expect("createConfig" in moduleExports).toBe(false);
    expect("tsConfig" in moduleExports).toBe(false);
    expect("strict" in moduleExports).toBe(false);
  });
});
