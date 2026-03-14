import { describe, expect, it } from "vitest";

import { codeperfectPlugin } from "./codeperfect-plugin";

describe("codeperfect plugin", () => {
  it("exposes the package-owned rule registry", () => {
    expect(Object.keys(codeperfectPlugin.rules).toSorted()).toStrictEqual([
      "assert-actual-expected-names",
      "barrel-files-exports-only",
      "consistent-barrel-files",
      "enforce-aaa-phase-purity",
      "enforce-aaa-structure",
      "no-interface-member-docs",
      "no-reexports-outside-barrels",
      "prefer-interface-types",
      "prefer-vi-mocked-import",
      "require-aaa-sections",
      "require-act-result-capture",
      "require-example-language",
      "require-test-companion",
      "single-act-statement",
      "single-line-jsdoc",
    ]);
  });
});
