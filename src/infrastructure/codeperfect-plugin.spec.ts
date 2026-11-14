import { describe, expect, it } from "vitest";

import { codeperfectPlugin } from "./codeperfect-plugin";

describe("codeperfect plugin", () => {
  it("exposes the package-owned rule registry", () => {
    // Arrange
    const expectedRuleNames = [
      "assert-actual-expected-names",
      "barrel-files-exports-only",
      "consistent-barrel-files",
      "enforce-aaa-structure",
      "no-import-export-aliases",
      "no-import-export-extensions",
      "no-interface-member-docs",
      "no-multiple-declarators",
      "no-reexports-outside-barrels",
      "no-unused-exports",
      "no-unused-public-members",
      "no-useless-delegation",
      "prefer-interface-types",
      "prefer-package-subpath-imports",
      "prefer-vi-mocked-import",
      "require-act-result-capture",
      "require-example-language",
      "require-test-companion",
      "single-act-statement",
      "single-line-jsdoc",
    ];

    // Act
    const actualRuleNames = Object.keys(codeperfectPlugin.rules).toSorted(
      (left, right) => (left === right ? 0 : left < right ? -1 : 1),
    );

    // Assert
    expect(actualRuleNames).toStrictEqual(expectedRuleNames);
  });
});

const ruleEntries = Object.entries(codeperfectPlugin.rules).map(
  ([ruleName, rule]) => ({ rule, ruleName }),
);

const expectedRuleContracts = [
  [
    "assert-actual-expected-names",
    "suggestion",
    "Require Assert-phase comparison variables to use actual*/expected* prefixes.",
  ],
  [
    "barrel-files-exports-only",
    "problem",
    "Require barrel files to only contain re-export statements or type-only declarations.",
  ],
  [
    "consistent-barrel-files",
    "problem",
    "Enforce or forbid barrel files with consistent, allowed names.",
  ],
  [
    "enforce-aaa-structure",
    "problem",
    "Require explicit AAA markers, enforce section order and uniqueness, and keep setup, action, and assertions in their intended phases.",
  ],
  [
    "no-import-export-aliases",
    "problem",
    "Forbid aliased import/export names unless the original name is already bound in the same file.",
  ],
  [
    "no-import-export-extensions",
    "problem",
    "Forbid explicit file extensions in import/export module specifiers.",
  ],
  [
    "no-interface-member-docs",
    "problem",
    "Disallow documenting interface members in @param tags; document them on the interface instead.",
  ],
  [
    "no-multiple-declarators",
    "suggestion",
    "Require variable declarations to contain exactly one declarator per statement.",
  ],
  [
    "no-reexports-outside-barrels",
    "problem",
    "Require non-barrel files to export only locally defined values.",
  ],
  [
    "no-unused-exports",
    "problem",
    "Disallow exports that are unused or consumed only by test files.",
  ],
  [
    "no-unused-public-members",
    "problem",
    "Disallow public members that are unused by production code unless their host is part of the public API.",
  ],
  [
    "no-useless-delegation",
    "suggestion",
    "Disallow named functions that only delegate directly to another call.",
  ],
  [
    "prefer-interface-types",
    "suggestion",
    "Require named interfaces or type aliases for object types in parameters, return types, and variable annotations.",
  ],
  [
    "prefer-package-subpath-imports",
    "suggestion",
    "Prefer package.json subpath imports over matching relative module specifiers.",
  ],
  [
    "prefer-vi-mocked-import",
    "suggestion",
    "Prefer inlining vi.fn mocks in vi.mock/vi.doMock factories and using vi.mocked(...).",
  ],
  [
    "require-act-result-capture",
    "suggestion",
    "Require non-void Act expressions to store the observed result before assertions.",
  ],
  [
    "require-example-language",
    "problem",
    "Require @example tags to use fenced code blocks with a language.",
  ],
  [
    "require-test-companion",
    "problem",
    "Require each test file to have a matching TypeScript source file.",
  ],
  [
    "single-act-statement",
    "suggestion",
    "Require the // Act section to contain a single top-level statement or declaration.",
  ],
  [
    "single-line-jsdoc",
    "layout",
    "Require JSDoc comments to use a single line when they fit.",
  ],
] as const;

describe("codeperfect plugin rules", () => {
  it("covers every package-owned rule with metadata", () => {
    // Act
    const actualRuleSummaries = Object.fromEntries(
      ruleEntries.map(({ rule, ruleName }) => [
        ruleName,
        {
          createType: typeof rule.create,
          description: rule.meta?.docs?.description,
          hasMessages: Object.keys(rule.meta?.messages ?? {}).length > 0,
          schemaIsArray: Array.isArray(rule.meta?.schema),
          type: rule.meta?.type,
          url: rule.meta?.docs?.url,
        },
      ]),
    );

    // Assert
    expect(ruleEntries).toHaveLength(expectedRuleContracts.length);
    expect(actualRuleSummaries).toStrictEqual(
      Object.fromEntries(
        expectedRuleContracts.map(([ruleName, type, description]) => [
          ruleName,
          {
            createType: "function",
            description,
            hasMessages: true,
            schemaIsArray: true,
            type,
            url: `https://github.com/parloti/eslint-plugin/blob/main/docs/rules/${ruleName}.md`,
          },
        ]),
      ),
    );
  });
});
