import type { Linter as EslintLinterType } from "eslint";

import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import {
  enforceAaaPhasePurityRule,
  enforceAaaStructureRule,
  requireAaaSectionsRule,
  requireActResultCaptureRule,
} from "../../src";

/** Aggregated AAA lint result for one end-to-end regression case. */
interface AaaLintResult {
  /** Message ids emitted by the combined AAA rules. */
  messageIds: (string | undefined)[];

  /** Output produced by a fix run. */
  output: string;
}

/** Default spec filename used by the AAA regression cases. */
const aaaFilename = "example.spec.ts";

/** Shared flat config for the combined AAA rules. */
const aaaConfig: EslintLinterType.Config[] = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      parser,
      sourceType: "module",
    },
    plugins: {
      codeperfect: {
        rules: {
          "enforce-aaa-phase-purity": enforceAaaPhasePurityRule,
          "enforce-aaa-structure": enforceAaaStructureRule,
          "require-aaa-sections": requireAaaSectionsRule,
          "require-act-result-capture": requireActResultCaptureRule,
        },
      },
    },
    rules: {
      "codeperfect/enforce-aaa-phase-purity": "error",
      "codeperfect/enforce-aaa-structure": "error",
      "codeperfect/require-aaa-sections": "error",
      "codeperfect/require-act-result-capture": "error",
    },
  },
];

/**
 * Runs the combined AAA rule set against one source snippet.
 * @param code Source text under test.
 * @returns Combined diagnostics and fix output.
 * @example
 * ```typescript
 * const result = runAaaRules('it("demo", () => {});');
 * void result;
 * ```
 */
function runAaaRules(code: string): AaaLintResult {
  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(code, aaaConfig, aaaFilename);
  const fixedResult = linter.verifyAndFix(code, aaaConfig, aaaFilename);

  return {
    messageIds: messages.map((message) => message.messageId),
    output: fixedResult.output,
  };
}

describe("aaa regressions e2e", () => {
  it("rejects Arrange sections that contain only comments", () => {
    // Arrange
    const code = [
      'it("rejects comment-only arrange", () => {',
      "  // Arrange",
      "  // no setup needed beyond test data",
      "",
      "  // Act",
      '  const configs = boundaries({ files: ["src/**/*.ts"] });',
      "",
      "  // Assert",
      "  expect(configs.length).toBeGreaterThan(0);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds.length).toBeGreaterThan(0);
  });

  it("rejects Arrange sections that contain only whitespace", () => {
    // Arrange
    const code = [
      'it("rejects whitespace-only arrange", () => {',
      "  // Arrange",
      "",
      "",
      "  // Act",
      "  const actualResult = run();",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds.length).toBeGreaterThan(0);
  });

  it("rejects evaluated expressions inside expect without autofixing", () => {
    // Arrange
    const code = [
      'it("keeps evaluation out of assert", () => {',
      "  // Arrange",
      "  const input = core;",
      "",
      "  // Act & Assert",
      "  expect(getRuleKeys(input)).toStrictEqual([",
      '    "codeperfect/no-multiple-declarators",',
      '    "codeperfect/prefer-interface-types",',
      "  ]);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds.length).toBeGreaterThan(0);
    expect(result.output).toBe(code);
  });

  it("accepts assertions against values computed in Act", () => {
    // Arrange
    const code = [
      'it("asserts on precomputed values", () => {',
      "  // Arrange",
      "  const input = core;",
      "",
      "  // Act",
      "  const ruleKeys = getRuleKeys(input);",
      "",
      "  // Assert",
      "  expect(ruleKeys).toStrictEqual([",
      '    "codeperfect/no-multiple-declarators",',
      '    "codeperfect/prefer-interface-types",',
      "  ]);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("accepts AAA sections when Arrange is the first line inside the test", () => {
    // Arrange
    const code = [
      'it("allows the first AAA section without a leading blank line", () => {',
      "  // Arrange",
      "  const input = 1;",
      "",
      "  // Act",
      "  const actualResult = run(input);",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("accepts compound void-like helpers in Act", () => {
    // Arrange
    const code = [
      'it("allows scheduleAndFlush helpers", () => {',
      "  // Arrange",
      "  let wasExecuted = false;",
      "  const scheduleAndFlush = (): void => {",
      "    wasExecuted = true;",
      "  };",
      "",
      "  // Act",
      "  scheduleAndFlush();",
      "",
      "  // Assert",
      "  expect(wasExecuted).toBe(true);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("accepts deferred async helpers declared in Arrange", () => {
    // Arrange
    const code = [
      'it("allows deferred async helpers", async () => {',
      "  // Arrange",
      "  const runner = async (): Promise<number> => {",
      "    await prepareRemoteState();",
      "    return 1;",
      "  };",
      "",
      "  // Act",
      "  const actualResult = await runner();",
      "",
      "  // Assert",
      "  expect(actualResult).toBe(1);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("accepts error objects prepared during Arrange", () => {
    // Arrange
    const code = [
      'it("allows error setup in Arrange", () => {',
      "  // Arrange",
      "  const diagram = '--#';",
      "  const error = new Error('Test Error');",
      "",
      "  // Act",
      "  const result$ = hot(diagram, void 0, error);",
      "",
      "  // Assert",
      "  expect(result$.diagram).toBe(diagram);",
      "  expect(result$.error).toBe(error);",
      "});",
    ].join("\n");

    // Act
    const result = runAaaRules(code);

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });
});
