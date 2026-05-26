import type { Rule } from "eslint";

import { describe, expect, it } from "vitest";

import { runRuleCase } from "./index";

/** Demonstration rule used to validate the rule-case runner helper. */
const demoRule: Rule.RuleModule = {
  create: (context) => {
    const firstOption = context.options[0] as
      | Record<string, unknown>
      | undefined;
    const identifierFromOption = firstOption?.["identifier"];
    const identifier =
      typeof identifierFromOption === "string" ? identifierFromOption : "bad";

    return {
      Identifier(node) {
        if (node.name !== identifier) {
          return;
        }

        context.report({
          fix: (fixer) => fixer.replaceText(node, "good"),
          messageId: "match",
          node,
        });
      },
    };
  },
  meta: {
    fixable: "code",
    messages: {
      match: "match",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          identifier: {
            type: "string",
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

describe(runRuleCase, () => {
  it("runs a case with the default filename and no autofix output", () => {
    // Arrange
    const testCase = {
      code: "const bad = 1;",
    };

    // Act
    const result = runRuleCase("demo-rule", demoRule, testCase);

    // Assert
    expect(result.messageIds).toStrictEqual(["match"]);
    expect(result.output).toBeUndefined();
  });

  it("passes explicit filename, options, and language options through to the linter", () => {
    // Arrange
    const testCase = {
      code: "const worse = 1;",
      filename: "custom.spec.ts",
      languageOptions: {
        sourceType: "script" as const,
      },
      options: [{ identifier: "worse" }],
      output: "const good = 1;",
    };

    // Act
    const result = runRuleCase("demo-rule", demoRule, testCase);

    // Assert
    expect(result.messageIds).toStrictEqual(["match"]);
    expect(result.output).toBe(testCase.output);
  });
});
