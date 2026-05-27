import { describe, expect, it } from "vitest";

import { customRules } from "./custom-rules";

/**
 * Builds the canonical documentation URL used by package-owned rules.
 * @param ruleName Package-owned ESLint rule name.
 * @returns Canonical markdown URL for the rule documentation page.
 * @example
 * ```typescript
 * const url = getCustomRuleDocumentationUrl("prefer-interface-types");
 * void url;
 * ```
 */
const getCustomRuleDocumentationUrl = (ruleName: string): string =>
  `https://github.com/parloti/eslint-plugin/blob/main/docs/rules/${ruleName}.md`;

/** Summary of the enforced custom rule contract. */
interface CustomRuleSummary {
  /** JavaScript runtime type of the rule creator. */
  createType: string;

  /** Human-readable rule description. */
  description: string | undefined;

  /** Whether the rule defines at least one message. */
  hasMessages: boolean;

  /** ESLint rule name without the plugin prefix. */
  ruleName: string;

  /** Whether the rule exposes a schema array. */
  schemaIsArray: boolean;

  /** ESLint rule category. */
  type: string | undefined;

  /** Canonical documentation URL. */
  url: string | undefined;
}

/**
 * Summarizes the shared contract for a package-owned custom rule.
 * @param ruleEntry Registry entry under test.
 * @returns Return value output.
 * @example
 * ```typescript
 * summarizeCustomRuleContract(customRules[0]!);
 * ```
 */
const summarizeCustomRuleContract = (
  ruleEntry: (typeof customRules)[number],
): CustomRuleSummary => {
  const documentation = ruleEntry.rule.meta?.docs;
  const messages = ruleEntry.rule.meta?.messages;

  return {
    createType: typeof ruleEntry.rule.create,
    description: documentation?.description,
    hasMessages: Object.keys(messages ?? {}).length > 0,
    ruleName: ruleEntry.ruleName,
    schemaIsArray: Array.isArray(ruleEntry.rule.meta?.schema),
    type: ruleEntry.rule.meta?.type,
    url: documentation?.url,
  };
};

describe("custom rule registry", () => {
  it("covers every package-owned rule with metadata", () => {
    // Arrange
    const expectedRuleCount = 17;

    // Act
    const actualRuleSummaries = customRules.map((ruleEntry) =>
      summarizeCustomRuleContract(ruleEntry),
    );

    // Assert
    expect(customRules).toHaveLength(expectedRuleCount);
    expect(actualRuleSummaries).toStrictEqual([
      {
        createType: "function",
        description:
          "Require Assert-phase comparison variables to use actual*/expected* prefixes.",
        hasMessages: true,
        ruleName: "assert-actual-expected-names",
        schemaIsArray: true,
        type: "suggestion",
        url: getCustomRuleDocumentationUrl("assert-actual-expected-names"),
      },
      {
        createType: "function",
        description:
          "Require barrel files to only contain re-export statements or type-only declarations.",
        hasMessages: true,
        ruleName: "barrel-files-exports-only",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("barrel-files-exports-only"),
      },
      {
        createType: "function",
        description:
          "Enforce or forbid barrel files with consistent, allowed names.",
        hasMessages: true,
        ruleName: "consistent-barrel-files",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("consistent-barrel-files"),
      },
      {
        createType: "function",
        description:
          "Require explicit AAA markers, enforce section order and uniqueness, and keep setup, action, and assertions in their intended phases.",
        hasMessages: true,
        ruleName: "enforce-aaa-structure",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("enforce-aaa-structure"),
      },
      {
        createType: "function",
        description:
          "Forbid aliased import/export names unless the original name is already bound in the same file.",
        hasMessages: true,
        ruleName: "no-import-export-aliases",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("no-import-export-aliases"),
      },
      {
        createType: "function",
        description:
          "Forbid explicit file extensions in import/export module specifiers.",
        hasMessages: true,
        ruleName: "no-import-export-extensions",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("no-import-export-extensions"),
      },
      {
        createType: "function",
        description:
          "Disallow exports that are unused or consumed only by test files.",
        hasMessages: true,
        ruleName: "no-unused-exports",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("no-unused-exports"),
      },
      {
        createType: "function",
        description:
          "Require non-barrel files to export only locally defined values.",
        hasMessages: true,
        ruleName: "no-reexports-outside-barrels",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("no-reexports-outside-barrels"),
      },
      {
        createType: "function",
        description:
          "Require variable declarations to contain exactly one declarator per statement.",
        hasMessages: true,
        ruleName: "no-multiple-declarators",
        schemaIsArray: true,
        type: "suggestion",
        url: getCustomRuleDocumentationUrl("no-multiple-declarators"),
      },
      {
        createType: "function",
        description:
          "Require named interfaces or type aliases for object types in parameters, return types, and variable annotations.",
        hasMessages: true,
        ruleName: "prefer-interface-types",
        schemaIsArray: true,
        type: "suggestion",
        url: getCustomRuleDocumentationUrl("prefer-interface-types"),
      },
      {
        createType: "function",
        description:
          "Disallow documenting interface members in @param tags; document them on the interface instead.",
        hasMessages: true,
        ruleName: "no-interface-member-docs",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("no-interface-member-docs"),
      },
      {
        createType: "function",
        description:
          "Require @example tags to use fenced code blocks with a language.",
        hasMessages: true,
        ruleName: "require-example-language",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("require-example-language"),
      },
      {
        createType: "function",
        description:
          "Require JSDoc comments to use a single line when they fit.",
        hasMessages: true,
        ruleName: "single-line-jsdoc",
        schemaIsArray: true,
        type: "layout",
        url: getCustomRuleDocumentationUrl("single-line-jsdoc"),
      },
      {
        createType: "function",
        description:
          "Prefer inlining vi.fn mocks in vi.mock/vi.doMock factories and using vi.mocked(...).",
        hasMessages: true,
        ruleName: "prefer-vi-mocked-import",
        schemaIsArray: true,
        type: "suggestion",
        url: getCustomRuleDocumentationUrl("prefer-vi-mocked-import"),
      },
      {
        createType: "function",
        description:
          "Require non-void Act expressions to store the observed result before assertions.",
        hasMessages: true,
        ruleName: "require-act-result-capture",
        schemaIsArray: true,
        type: "suggestion",
        url: getCustomRuleDocumentationUrl("require-act-result-capture"),
      },
      {
        createType: "function",
        description:
          "Require each test file to have a matching TypeScript source file.",
        hasMessages: true,
        ruleName: "require-test-companion",
        schemaIsArray: true,
        type: "problem",
        url: getCustomRuleDocumentationUrl("require-test-companion"),
      },
      {
        createType: "function",
        description:
          "Require the // Act section to contain a single top-level statement or declaration.",
        hasMessages: true,
        ruleName: "single-act-statement",
        schemaIsArray: true,
        type: "suggestion",
        url: getCustomRuleDocumentationUrl("single-act-statement"),
      },
    ]);
  });
});
