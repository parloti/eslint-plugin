import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { enforceAaaPhasePurityRule } from "../../src";
import { runRuleCase } from "../support";

/**
 * Runs the rule against inline source text and returns emitted message ids.
 * @param code Source code to lint.
 * @returns Emitted message ids for the supplied source.
 * @example
 * ```typescript
 * const messageIds = runRule('it("demo", () => {});');
 * void messageIds;
 * ```
 */
function runRule(code: string): (string | undefined)[] {
  const linter = new Linter({ configType: "flat" });

  return linter
    .verify(
      code,
      [
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
              },
            },
          },
          rules: {
            "codeperfect/enforce-aaa-phase-purity": "error",
          },
        },
      ],
      "example.spec.ts",
    )
    .map((message) => message.messageId);
}

describe("enforce-aaa-phase-purity e2e", () => {
  it.each([
    {
      code: [
        'it("keeps async work out of arrange", async () => {',
        "  // Arrange",
        "  let expectedValue = 1;",
        "  const actualResult = await run();",
        "",
        "  // Act",
        "  setupHarness();",
        "",
        "  // Assert",
        "  expectedValue = 2;",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      errors: [
        { messageId: "missingMeaningfulAct" },
        { messageId: "awaitOutsideAct" },
        { messageId: "asyncInArrange" },
        { messageId: "actionInArrange" },
        { messageId: "setupAfterAct" },
        { messageId: "mutationAfterAct" },
      ],
      filename: "example.spec.ts",
    },
    {
      code: [
        'test("keeps assertions in assert", () => {',
        "  // Arrange",
        "  const expectedValue = 1;",
        "",
        "  // Act",
        "  expect(run()).toBe(expectedValue);",
        "",
        "  // Assert",
        "  const actualResult = 1;",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "assertionOutsideAssert" }],
      filename: "example.spec.ts",
    },
  ])("rejects impure AAA phases %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "enforce-aaa-phase-purity",
      enforceAaaPhasePurityRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
  });

  it.each([
    {
      code: [
        'it("keeps phases pure", async () => {',
        "  // Arrange",
        "  const input = 1;",
        "  const expectedValue = 2;",
        "",
        "  // Act",
        "  const actualResult = await run(input);",
        "",
        "  // Assert",
        "  expect(actualResult).toBe(expectedValue);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
    {
      code: [
        'it("allows combined act and assert markers", () => {',
        "",
        "  // Arrange",
        "  const input = 1;",
        "",
        "  // Act & Assert",
        "  const actualResult = run(input);",
        "  expect(actualResult).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ])("accepts pure AAA phases %#", (testCase) => {
    // Arrange

    // Act
    const result = runRuleCase(
      "enforce-aaa-phase-purity",
      enforceAaaPhasePurityRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual([]);
  });

  it("rejects evaluated expressions inside expect", () => {
    // Arrange
    const testCase = {
      code: [
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
      ].join("\n"),
      errors: [{ messageId: "nonAssertionInAssert" }],
      filename: "example.spec.ts",
    };

    // Act
    const result = runRuleCase(
      "enforce-aaa-phase-purity",
      enforceAaaPhasePurityRule,
      testCase,
    );

    // Assert
    expect(result.messageIds).toStrictEqual(
      testCase.errors.map((error) => error.messageId),
    );
    expect(result.output).toBeUndefined();
  });
});

describe("enforce-aaa-phase-purity current limitations", () => {
  it("currently reports metadata-only self-tests as assertions outside assert", () => {
    // Arrange
    const messageIds = runRule(
      [
        'it("defines metadata and messages", () => {',
        "  // Arrange",
        '  expect(rule.meta?.messages).toHaveProperty("missingMeaningfulAct");',
        "",
        "  // Act & Assert",
        '  expect(rule.meta?.docs?.description).toContain("phases");',
        "});",
      ].join("\n"),
    );

    // Act & Assert
    expect(messageIds).toStrictEqual(["assertionOutsideAssert"]);
  });

  it("currently reports helper-driven utility specs as setup after act", () => {
    // Arrange
    const messageIds = runRule(
      [
        'it("checks lintable filenames", () => {',
        "  // Arrange",
        "  const state = getOptions([]);",
        "",
        "  // Act",
        '  const filename = "src/index.ts";',
        "  const lintable = shouldLintFile(filename, state.folders, state.names);",
        "",
        "  // Assert",
        "  expect(lintable).toBe(true);",
        "});",
      ].join("\n"),
    );

    // Act & Assert
    expect(messageIds).toStrictEqual(["setupAfterAct"]);
  });
});
