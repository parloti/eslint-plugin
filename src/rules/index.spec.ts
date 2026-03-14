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
    expect(barrelFilesExportsOnlyRule).toBe(
      architecture.barrelFilesExportsOnlyRule,
    );
    expect(consistentBarrelFilesRule).toBe(
      architecture.consistentBarrelFilesRule,
    );
    expect(noReexportsOutsideBarrelsRule).toBe(
      architecture.noReexportsOutsideBarrelsRule,
    );
  });

  it("re-exports core and documentation rules", () => {
    expect(noMultipleDeclaratorsRule).toBe(core.noMultipleDeclaratorsRule);
    expect(preferInterfaceTypesRule).toBe(core.preferInterfaceTypesRule);
    expect(noInterfaceMemberDocumentationRule).toBe(
      documentation.noInterfaceMemberDocumentationRule,
    );
    expect(requireExampleLanguageRule).toBe(
      documentation.requireExampleLanguageRule,
    );
    expect(singleLineJsdocRule).toBe(documentation.singleLineJsdocRule);
  });

  it("re-exports testing rules", () => {
    expect(preferViMockedImportRule).toBe(testing.preferViMockedImportRule);
    expect(requireTestCompanionRule).toBe(testing.requireTestCompanionRule);
  });
});
