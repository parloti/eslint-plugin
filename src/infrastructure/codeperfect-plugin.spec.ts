import { describe, expect, it } from "vitest";

import { codeperfectPlugin } from "./codeperfect-plugin";

describe("codeperfect plugin", () => {
  it("exposes the package-owned rule registry", () => {
    // Arrange
    const expectedRuleNames = [
      "assert-actual-expected-names",
      "barrel-files-exports-only",
      "consistent-barrel-files",
      "enforce-aaa-structure",
      "no-import-export-aliases",
      "no-import-export-extensions",
      "no-interface-member-docs",
      "no-multiple-declarators",
      "no-reexports-outside-barrels",
      "no-unused-exports",
      "prefer-interface-types",
      "prefer-vi-mocked-import",
      "require-aaa-sections",
      "require-act-result-capture",
      "require-example-language",
      "require-test-companion",
      "single-act-statement",
      "single-line-jsdoc",
    ];

    // Act
    const actualRuleNames = Object.keys(codeperfectPlugin.rules).toSorted();

    // Assert
    expect(actualRuleNames).toStrictEqual(expectedRuleNames);
  });
});
