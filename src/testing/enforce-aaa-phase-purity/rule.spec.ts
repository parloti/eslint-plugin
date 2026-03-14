import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import { parser } from "typescript-eslint";

import { enforceAaaPhasePurityRule } from "./rule";

function runRule(code: string) {
  const linter = new Linter({ configType: "flat" });

  return linter.verify(
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
  );
}

describe("enforce-aaa-phase-purity rule", () => {
  it("defines metadata and messages", () => {
    expect(enforceAaaPhasePurityRule.meta?.messages).toHaveProperty(
      "missingMeaningfulAct",
    );
    expect(enforceAaaPhasePurityRule.meta?.docs?.description).toContain(
      "phases",
    );
  });

  it("reports arrange assertions, assert awaits, and non-assertion assert code", () => {
    const messages = runRule(
      [
        'it("covers extra branches", async () => {',
        "  // Arrange",
        "  expect(true).toBe(true);",
        "",
        "  // Act",
        "  const actualResult = run();",
        "",
        "  // Assert",
        "  await verify(actualResult);",
        "  console.log(actualResult);",
        "});",
      ].join("\n"),
    );

    expect(messages.map((message) => message.messageId)).toStrictEqual([
      "assertionOutsideAssert",
      "awaitOutsideAct",
      "nonAssertionInAssert",
      "nonAssertionInAssert",
    ]);
  });

  it("skips files that do not declare all AAA sections", () => {
    expect(
      runRule(
        [
          'it("skips incomplete markup", () => {',
          "  const actualResult = run();",
          "  expect(actualResult).toBe(1);",
          "});",
        ].join("\n"),
      ),
    ).toStrictEqual([]);
  });

  it("reports await usage inside Assert", () => {
    expect(
      runRule(
        [
          'it("awaits in assert", async () => {',
          "  // Arrange",
          "  const input = 1;",
          "",
          "  // Act",
          "  const actualResult = run(input);",
          "",
          "  // Assert",
          "  await verify(actualResult);",
          "});",
        ].join("\n"),
      ).map((message) => message.messageId),
    ).toStrictEqual(["awaitOutsideAct", "nonAssertionInAssert"]);
  });

  it("reports mutation inside Assert", () => {
    expect(
      runRule(
        [
          'it("mutates in assert", () => {',
          "  // Arrange",
          "  const items = [1];",
          "",
          "  // Act",
          "  const actualResult = run(items);",
          "",
          "  // Assert",
          "  items.push(actualResult);",
          "});",
        ].join("\n"),
      ).map((message) => message.messageId),
    ).toStrictEqual(["mutationAfterAct"]);
  });

  it("accepts a clean AAA flow", () => {
    expect(
      runRule(
        [
          'it("stays clean", async () => {',
          "  // Arrange",
          "  const input = 1;",
          "",
          "  // Act",
          "  const actualResult = await run(input);",
          "",
          "  // Assert",
          "  expect(actualResult).toBe(1);",
          "});",
        ].join("\n"),
      ),
    ).toStrictEqual([]);
  });
});
