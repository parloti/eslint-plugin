import { Linter } from "eslint";
import { parser } from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { noUselessDelegationRule } from "./rule";

/**
 * Runs the rule against one TypeScript source snippet.
 * @param code Source code passed to the linter.
 * @returns Collected message identifiers from the lint run.
 * @example
 * ```typescript
 * const result = lint("function run(value) { return service.run(value); }");
 * ```
 */
const lint = (code: string): string[] => {
  const linter = new Linter({ configType: "flat" });

  return linter
    .verify(
      code,
      [
        {
          files: ["**/*.ts"],
          languageOptions: { parser },
          plugins: {
            codeperfect: {
              rules: { "no-useless-delegation": noUselessDelegationRule },
            },
          },
          rules: { "codeperfect/no-useless-delegation": "error" },
        },
      ] as Parameters<typeof linter.verify>[1],
      "feature.ts",
    )
    .map((message) => message.messageId ?? "");
};

describe("no-useless-delegation rule", () => {
  it("exposes suggestion metadata without a fix", () => {
    // Arrange
    const metadata = noUselessDelegationRule.meta;

    // Act
    const actual = {
      createType: typeof noUselessDelegationRule.create,
      fixable: metadata?.fixable,
      type: metadata?.type,
    };

    // Assert
    expect(actual).toStrictEqual({
      createType: "function",
      fixable: void 0,
      type: "suggestion",
    });
  });

  it.each([
    "function run(value) { return service.run(value); }",
    "const run = (value) => service.run(value);",
    "const run = function (value) { return service.run(value); };",
    "function run(...values) { return service.run(...values); }",
    "function run() { return service.run(); }",
    "const run = (value) => service.run(value)",
  ])("reports exact pass-through functions: %s", (code) => {
    // Act
    const actual = lint(code);

    // Assert
    expect(actual).toStrictEqual(["uselessDelegation"]);
  });

  it.each([
    "function run(value) { return run(value); }",
    "async function run(value) { return service.run(value); }",
    "function* run(value) { return service.run(value); }",
    "function run(value) { return service.run(normalize(value)); }",
    "function run(first, second) { return service.run(second, first); }",
    "function run(value = defaultValue) { return service.run(value); }",
    "function run({ value }) { return service.run(value); }",
    "function run(value) { log(value); return service.run(value); }",
    "function run(value) { return 'value'.trim(); }",
    "const run = 1;",
    "const run = () => {};",
  ])("does not report non-delegations: %s", (code) => {
    // Act
    const actual = lint(code);

    // Assert
    expect(actual).toStrictEqual([]);
  });
});
