import { describe, expect, it } from "vitest";

import { codeperfectPlugin, codeperfectRules } from "./codeperfect-plugin";
import { aaa, all, architecture, core, docs, testing } from "./presets";

type RulesConfig = {
  rules?: Record<string, unknown>;
};

function getRuleKeys(config: RulesConfig): string[] {
  return Object.keys(config.rules ?? {}).toSorted();
}

describe("ready-to-use presets", () => {
  it("registers the codeperfect plugin on every preset", () => {
    expect(all.plugins?.["codeperfect"]).toBe(codeperfectPlugin);
    expect(architecture.plugins?.["codeperfect"]).toBe(codeperfectPlugin);
    expect(core.plugins?.["codeperfect"]).toBe(codeperfectPlugin);
    expect(docs.plugins?.["codeperfect"]).toBe(codeperfectPlugin);
    expect(testing.plugins?.["codeperfect"]).toBe(codeperfectPlugin);
    expect(aaa.plugins?.["codeperfect"]).toBe(codeperfectPlugin);
  });

  it("enables every package-owned rule in the all preset", () => {
    expect(getRuleKeys(all)).toStrictEqual(
      Object.keys(codeperfectRules)
        .map((ruleName) => `codeperfect/${ruleName}`)
        .toSorted(),
    );
  });

  it("groups the architecture rules", () => {
    expect(getRuleKeys(architecture)).toStrictEqual([
      "codeperfect/barrel-files-exports-only",
      "codeperfect/consistent-barrel-files",
      "codeperfect/no-reexports-outside-barrels",
    ]);
  });

  it("groups the core rules", () => {
    expect(getRuleKeys(core)).toStrictEqual([
      "codeperfect/prefer-interface-types",
    ]);
  });

  it("groups the docs rules", () => {
    expect(getRuleKeys(docs)).toStrictEqual([
      "codeperfect/no-interface-member-docs",
      "codeperfect/require-example-language",
      "codeperfect/single-line-jsdoc",
    ]);
  });

  it("groups the testing rules", () => {
    expect(getRuleKeys(testing)).toStrictEqual([
      "codeperfect/assert-actual-expected-names",
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/prefer-vi-mocked-import",
      "codeperfect/require-aaa-sections",
      "codeperfect/require-act-result-capture",
      "codeperfect/require-test-companion",
      "codeperfect/single-act-statement",
    ]);
  });

  it("groups the AAA rules", () => {
    expect(getRuleKeys(aaa)).toStrictEqual([
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/require-aaa-sections",
    ]);
  });
});
