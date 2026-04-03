import { describe, expect, it } from "vitest";

import { codeperfectPlugin } from "./codeperfect-plugin";
import {
  aaa,
  all,
  architecture,
  core,
  documentation,
  testing,
} from "./presets";

/** Minimal config shape used by preset tests. */
interface RulesConfig {
  /** Optional rule map from the generated config. */
  rules?: Record<string, unknown>;
}

/**
 * Returns sorted rule keys for a preset config.
 * @param config Preset config to inspect.
 * @returns Sorted rule keys.
 * @example
 * ```typescript
 * const keys = getRuleKeys({ rules: { "codeperfect/example": "error" } });
 * ```
 */
function getRuleKeys(config: RulesConfig): string[] {
  return Object.keys(config.rules ?? {}).toSorted();
}

describe("ready-to-use presets", () => {
  it("registers the codeperfect plugin on every preset", () => {
    // Arrange
    const actualPlugins = [
      all.plugins?.["codeperfect"],
      architecture.plugins?.["codeperfect"],
      core.plugins?.["codeperfect"],
      documentation.plugins?.["codeperfect"],
      testing.plugins?.["codeperfect"],
      aaa.plugins?.["codeperfect"],
    ];

    // Act
    const expectedPlugins = Array.from({ length: actualPlugins.length }).fill(
      codeperfectPlugin,
    );

    // Assert
    expect(actualPlugins).toStrictEqual(expectedPlugins);
  });

  it("enables every package-owned rule in the all preset", () => {
    // Arrange
    const expectedRuleKeys = [
      "codeperfect/assert-actual-expected-names",
      "codeperfect/barrel-files-exports-only",
      "codeperfect/consistent-barrel-files",
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/no-interface-member-docs",
      "codeperfect/no-multiple-declarators",
      "codeperfect/no-reexports-outside-barrels",
      "codeperfect/prefer-interface-types",
      "codeperfect/prefer-vi-mocked-import",
      "codeperfect/prefer-vitest-incremental-casts",
      "codeperfect/require-aaa-sections",
      "codeperfect/require-act-result-capture",
      "codeperfect/require-example-language",
      "codeperfect/require-test-companion",
      "codeperfect/single-act-statement",
      "codeperfect/single-line-jsdoc",
    ];

    // Act
    const actualRuleKeys = getRuleKeys(all);

    // Assert
    expect(actualRuleKeys).toStrictEqual(expectedRuleKeys);
  });

  it("groups the architecture rules", () => {
    // Arrange
    const expectedRuleKeys = [
      "codeperfect/barrel-files-exports-only",
      "codeperfect/consistent-barrel-files",
      "codeperfect/no-reexports-outside-barrels",
    ];

    // Act
    const actualRuleKeys = getRuleKeys(architecture);

    // Assert
    expect(actualRuleKeys).toStrictEqual(expectedRuleKeys);
  });

  it("groups the core rules", () => {
    // Arrange
    const expectedRuleKeys = [
      "codeperfect/no-multiple-declarators",
      "codeperfect/prefer-interface-types",
    ];

    // Act
    const actualRuleKeys = getRuleKeys(core);

    // Assert
    expect(actualRuleKeys).toStrictEqual(expectedRuleKeys);
  });

  it("groups the docs rules", () => {
    // Arrange
    const expectedRuleKeys = [
      "codeperfect/no-interface-member-docs",
      "codeperfect/require-example-language",
      "codeperfect/single-line-jsdoc",
    ];

    // Act
    const actualRuleKeys = getRuleKeys(documentation);

    // Assert
    expect(actualRuleKeys).toStrictEqual(expectedRuleKeys);
  });

  it("groups the testing rules", () => {
    // Arrange
    const expectedRuleKeys = [
      "codeperfect/assert-actual-expected-names",
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/prefer-vi-mocked-import",
      "codeperfect/prefer-vitest-incremental-casts",
      "codeperfect/require-aaa-sections",
      "codeperfect/require-act-result-capture",
      "codeperfect/require-test-companion",
      "codeperfect/single-act-statement",
    ];

    // Act
    const actualRuleKeys = getRuleKeys(testing);

    // Assert
    expect(actualRuleKeys).toStrictEqual(expectedRuleKeys);
  });

  it("groups the AAA rules", () => {
    // Arrange
    const expectedRuleKeys = [
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/require-aaa-sections",
    ];

    // Act
    const actualRuleKeys = getRuleKeys(aaa);

    // Assert
    expect(actualRuleKeys).toStrictEqual(expectedRuleKeys);
  });
});
