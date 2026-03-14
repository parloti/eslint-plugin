import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import { parser } from "typescript-eslint";

import { requireAaaSectionsRule } from "./rule";

function runFix(code: string) {
  const linter = new Linter({ configType: "flat" });

  return linter.verifyAndFix(
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
              "require-aaa-sections": requireAaaSectionsRule,
            },
          },
        },
        rules: {
          "codeperfect/require-aaa-sections": "error",
        },
      },
    ],
    { filename: "example.spec.ts" },
  );
}

describe("require-aaa-sections rule", () => {
  it("defines metadata and fix support", () => {
    expect(requireAaaSectionsRule.meta?.fixable).toBe("code");
    expect(requireAaaSectionsRule.meta?.messages).toHaveProperty(
      "missingSections",
    );
  });

  it("does not crash when a multi-line empty test body cannot place section comments", () => {
    const result = runFix(
      ['it("is empty", () => {', "", "", "", "});"].join("\n"),
    );

    expect(result.fixed).toBe(false);
    expect(result.messages[0]?.messageId).toBe("missingSections");
  });

  it("combines missing section comments when one statement must represent multiple boundaries", () => {
    const result = runFix(
      [
        'it("combines boundaries", () => {',
        "  // Arrange",
        "",
        "  expect(run()).toBe(1);",
        "});",
      ].join("\n"),
    );

    expect(result.output).toContain("// Act & Assert");
  });

  it("does not offer a fix when the body is too short", () => {
    const result = runFix(
      [
        'it("stays report-only for short bodies", () => {',
        "  run();",
        "});",
      ].join("\n"),
    );

    expect(result.fixed).toBe(false);
    expect(result.messages[0]?.messageId).toBe("missingSections");
  });
});
