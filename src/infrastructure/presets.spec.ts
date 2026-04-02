import { describe, expect, it } from "vitest";

import { codeperfectPlugin, codeperfectRules } from "./codeperfect-plugin";
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

    // Act & Assert
    expect(getRuleKeys(all)).toStrictEqual(
      Object.keys(codeperfectRules)
        .map((ruleName) => `codeperfect/${ruleName}`)
        .toSorted(),
    );
  });

  it("groups the architecture rules", () => {
    // Arrange

    // Act & Assert
    expect(getRuleKeys(architecture)).toStrictEqual([
      "codeperfect/barrel-files-exports-only",
      "codeperfect/consistent-barrel-files",
      "codeperfect/no-reexports-outside-barrels",
    ]);
  });

  it("groups the core rules", () => {
    // Arrange

    // Act & Assert
    expect(getRuleKeys(core)).toStrictEqual([
      "codeperfect/no-multiple-declarators",
      "codeperfect/prefer-interface-types",
    ]);
  });

  it("groups the docs rules", () => {
    // Arrange

    // Act & Assert
    expect(getRuleKeys(documentation)).toStrictEqual([
      "codeperfect/no-interface-member-docs",
      "codeperfect/require-example-language",
      "codeperfect/single-line-jsdoc",
    ]);
  });

  it("groups the testing rules", () => {
    // Arrange

    // Act & Assert
    expect(getRuleKeys(testing)).toStrictEqual([
      "codeperfect/assert-actual-expected-names",
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/prefer-vi-mocked-import",
      "codeperfect/prefer-vitest-incremental-casts",
      "codeperfect/require-aaa-sections",
      "codeperfect/require-act-result-capture",
      "codeperfect/require-test-companion",
      "codeperfect/single-act-statement",
    ]);
  });

  it("groups the AAA rules", () => {
    // Arrange

    // Act & Assert
    expect(getRuleKeys(aaa)).toStrictEqual([
      "codeperfect/enforce-aaa-phase-purity",
      "codeperfect/enforce-aaa-structure",
      "codeperfect/require-aaa-sections",
    ]);
  });
});
