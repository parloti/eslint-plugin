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
  testing,
} from "./index";

describe("package entrypoint", () => {
  it("exports the plugin as the default and named root export", async () => {
    // Arrange

    // Act
    const moduleExports = await import("./index");

    // Assert
    expect(moduleExports.default).toBe(codeperfectPlugin);
    expect(moduleExports.codeperfectPlugin).toBe(codeperfectPlugin);
  });

  it("exports the package-owned rules and registry", () => {
    // Arrange
    const expectedRuleNames = [
      "assert-actual-expected-names",
      "barrel-files-exports-only",
      "consistent-barrel-files",
      "enforce-aaa-phase-purity",
      "enforce-aaa-structure",
      "no-reexports-outside-barrels",
      "no-multiple-declarators",
      "prefer-interface-types",
      "no-interface-member-docs",
      "require-example-language",
      "single-line-jsdoc",
      "prefer-vi-mocked-import",
      "prefer-vitest-incremental-casts",
      "require-aaa-sections",
      "require-act-result-capture",
      "require-test-companion",
      "single-act-statement",
    ];

    // Act
    const ruleRegistry = codeperfectPlugin.rules;

    // Assert
    expect(customRules.map((entry) => entry.ruleName)).toStrictEqual(
      expectedRuleNames,
    );
    expect(ruleRegistry?.["assert-actual-expected-names"]).toBe(
      assertActualExpectedNamesRule,
    );
    expect(ruleRegistry?.["barrel-files-exports-only"]).toBe(
      barrelFilesExportsOnlyRule,
    );
    expect(ruleRegistry?.["consistent-barrel-files"]).toBe(
      consistentBarrelFilesRule,
    );
    expect(ruleRegistry?.["enforce-aaa-phase-purity"]).toBe(
      enforceAaaPhasePurityRule,
    );
    expect(ruleRegistry?.["enforce-aaa-structure"]).toBe(
      enforceAaaStructureRule,
    );
    expect(ruleRegistry?.["no-reexports-outside-barrels"]).toBe(
      noReexportsOutsideBarrelsRule,
    );
    expect(ruleRegistry?.["no-multiple-declarators"]).toBe(
      noMultipleDeclaratorsRule,
    );
    expect(ruleRegistry?.["prefer-interface-types"]).toBe(
      preferInterfaceTypesRule,
    );
    expect(ruleRegistry?.["no-interface-member-docs"]).toBe(
      noInterfaceMemberDocumentationRule,
    );
    expect(ruleRegistry?.["require-example-language"]).toBe(
      requireExampleLanguageRule,
    );
    expect(ruleRegistry?.["single-line-jsdoc"]).toBe(singleLineJsdocRule);
    expect(ruleRegistry?.["prefer-vi-mocked-import"]).toBe(
      preferViMockedImportRule,
    );
    expect(ruleRegistry?.["prefer-vitest-incremental-casts"]).toBe(
      preferVitestIncrementalCastsRule,
    );
    expect(ruleRegistry?.["require-aaa-sections"]).toBe(requireAaaSectionsRule);
    expect(ruleRegistry?.["require-act-result-capture"]).toBe(
      requireActResultCaptureRule,
    );
    expect(ruleRegistry?.["require-test-companion"]).toBe(
      requireTestCompanionRule,
    );
    expect(ruleRegistry?.["single-act-statement"]).toBe(singleActStatementRule);
  });

  it("exports the ready-to-use presets", async () => {
    // Arrange

    // Act
    const moduleExports = await import("./index");

    // Assert
    expect(moduleExports.all).toBe(all);
    expect(moduleExports.architecture).toBe(architecture);
    expect(moduleExports.core).toBe(core);
    expect(moduleExports.docs).toBe(docs);
    expect(moduleExports.testing).toBe(testing);
    expect(moduleExports.aaa).toBe(aaa);
  });

  it("does not expose legacy config factory exports", async () => {
    // Arrange

    // Act
    const moduleExports = await import("./index");

    // Assert
    expect("config" in moduleExports).toBe(false);
    expect("createConfig" in moduleExports).toBe(false);
    expect("tsConfig" in moduleExports).toBe(false);
    expect("strict" in moduleExports).toBe(false);
  });
});
