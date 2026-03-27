import { describe, expect, it } from "vitest";

import * as core from "./index";
import * as noMultipleDeclarators from "./no-multiple-declarators";
import { noMultipleDeclaratorsRule } from "./no-multiple-declarators";
import * as preferInterfaceTypes from "./prefer-interface-types";
import { preferInterfaceTypesRule } from "./prefer-interface-types";

describe("core rules", () => {
  it("re-exports the core rule modules", () => {
    // Arrange
    const actualExports = [
      Object.is(core.noMultipleDeclaratorsRule, noMultipleDeclaratorsRule),
      Object.is(
        noMultipleDeclarators.noMultipleDeclaratorsRule,
        noMultipleDeclaratorsRule,
      ),
      Object.is(core.preferInterfaceTypesRule, preferInterfaceTypesRule),
      Object.is(
        preferInterfaceTypes.preferInterfaceTypesRule,
        preferInterfaceTypesRule,
      ),
    ];

    // Act
    const [
      exportsCoreNoMultipleDeclarators,
      exportsModuleNoMultipleDeclarators,
      exportsCorePreferInterfaceTypes,
      exportsModulePreferInterfaceTypes,
    ] = actualExports;

    // Assert
    expect(exportsCoreNoMultipleDeclarators).toBe(true);
    expect(exportsModuleNoMultipleDeclarators).toBe(true);
    expect(exportsCorePreferInterfaceTypes).toBe(true);
    expect(exportsModulePreferInterfaceTypes).toBe(true);
  });
});
