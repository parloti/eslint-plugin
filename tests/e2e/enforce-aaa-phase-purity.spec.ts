import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { enforceAaaPhasePurityRule } from "../../src";
import { createRuleTester } from "../support/rule-tester";

/**
 *
 */
const ruleTester = createRuleTester();

/**
 * @param code
 * @example
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

ruleTester.run("enforce-aaa-phase-purity", enforceAaaPhasePurityRule, {
  invalid: [
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
  ],
  valid: [
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
        "  expect(run(input)).toBe(1);",
        "});",
      ].join("\n"),
      filename: "example.spec.ts",
    },
  ],
});

describe("enforce-aaa-phase-purity future expectations", () => {
  it.fails(
    "allows metadata-only self-tests without a meaningful Act section",
    () => {
      // Arrange

      // Act & Assert
      expect(
        runRule(
          [
            'it("defines metadata and messages", () => {',
            "  // Arrange",
            '  expect(rule.meta?.messages).toHaveProperty("missingMeaningfulAct");',
            "",
            "  // Act & Assert",
            '  expect(rule.meta?.docs?.description).toContain("phases");',
            "});",
          ].join("\n"),
        ),
      ).toStrictEqual([]);
    },
  );

  it("allows helper-driven utility specs that separate setup from assertions", () => {
    // Arrange

    // Act & Assert
    expect(
      runRule(
        [
          'it("checks lintable filenames", () => {',
          "  // Arrange",
          "  const state = getOptions([]);",
          "",
          "  // Act",
          "  const filename = `${process.cwd()}/src/index.ts`;",
          "",
          "  // Assert",
          "  expect(shouldLintFile(filename, state.folders, state.names)).toBe(true);",
          "});",
        ].join("\n"),
      ),
    ).toStrictEqual([]);
  });
});
