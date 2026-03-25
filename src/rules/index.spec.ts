import { describe, expect, it } from "vitest";

import {
  barrelFilesExportsOnlyRule,
  consistentBarrelFilesRule,
  noInterfaceMemberDocumentationRule,
  noMultipleDeclaratorsRule,
  noReexportsOutsideBarrelsRule,
  preferInterfaceTypesRule,
  preferViMockedImportRule,
  requireExampleLanguageRule,
  requireTestCompanionRule,
  singleLineJsdocRule,
} from ".";
import * as architecture from "../architecture";
import * as core from "../core";
import * as documentation from "../docs";
import * as testing from "../testing";

describe("rules barrel", () => {
  it("re-exports architecture rules", () => {
    // Arrange
    const actualRules = [
      barrelFilesExportsOnlyRule,
      consistentBarrelFilesRule,
      noReexportsOutsideBarrelsRule,
    ];

    // Act
    const expectedRules = [
      architecture.barrelFilesExportsOnlyRule,
      architecture.consistentBarrelFilesRule,
      architecture.noReexportsOutsideBarrelsRule,
    ];

    // Assert
    expect(actualRules).toStrictEqual(expectedRules);
  });

  it("re-exports core and documentation rules", () => {
    // Arrange
    const actualRules = [
      noMultipleDeclaratorsRule,
      preferInterfaceTypesRule,
      noInterfaceMemberDocumentationRule,
      requireExampleLanguageRule,
      singleLineJsdocRule,
    ];

    // Act
    const expectedRules = [
      core.noMultipleDeclaratorsRule,
      core.preferInterfaceTypesRule,
      documentation.noInterfaceMemberDocumentationRule,
      documentation.requireExampleLanguageRule,
      documentation.singleLineJsdocRule,
    ];

    // Assert
    expect(actualRules).toStrictEqual(expectedRules);
  });

  it("re-exports testing rules", () => {
    // Arrange

    // Act
    const actualRules = [preferViMockedImportRule, requireTestCompanionRule];

    // Assert
    expect(actualRules).toStrictEqual([
      testing.preferViMockedImportRule,
      testing.requireTestCompanionRule,
    ]);
  });
});
